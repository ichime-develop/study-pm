package com.studypm.project;

import java.text.Normalizer;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

import com.studypm.account.Account;
import com.studypm.account.AccountRepository;
import com.studypm.common.error.BusinessConflictException;
import com.studypm.common.error.InvalidRequestException;
import com.studypm.common.error.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * プロジェクトCRUDの所有者検証、期間履歴、完了条件、削除順序を進行する。
 */
@Service
public class ProjectService {

    private static final ZoneId JST = ZoneId.of("Asia/Tokyo");

    private final ProjectRepository projectRepository;
    private final ProjectPeriodHistoryRepository projectPeriodHistoryRepository;
    private final ProjectQueryRepository projectQueryRepository;
    private final AccountRepository accountRepository;
    private final Clock clock;

    public ProjectService(
            ProjectRepository projectRepository,
            ProjectPeriodHistoryRepository projectPeriodHistoryRepository,
            ProjectQueryRepository projectQueryRepository,
            AccountRepository accountRepository,
            Clock clock
    ) {
        this.projectRepository = projectRepository;
        this.projectPeriodHistoryRepository = projectPeriodHistoryRepository;
        this.projectQueryRepository = projectQueryRepository;
        this.accountRepository = accountRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public ProjectListResponse list(UUID accountId, ProjectListQuery query) {
        ProjectStatus status = parseOptionalStatus(query.status());
        ProjectSort sort = ProjectSort.parse(query.sort());
        String keyword = normalizeKeyword(query.keyword());

        List<ProjectListItemResponse> filteredItems = projectRepository.findAllByAccount_Id(accountId).stream()
                .filter(project -> status == null || project.status() == status)
                .filter(project -> matchesKeyword(project, keyword))
                .map(project -> ProjectListItemResponse.from(
                        project,
                        projectQueryRepository.aggregateFor(project.id(), LocalDate.now(clock.withZone(JST)))
                ))
                .sorted(comparator(sort))
                .toList();

        int fromIndex = clampedOffset(query.page(), query.size(), filteredItems.size());
        int toIndex = Math.min(fromIndex + query.size(), filteredItems.size());
        int totalPages = filteredItems.isEmpty()
                ? 0
                : (int) Math.ceil((double) filteredItems.size() / query.size());
        return new ProjectListResponse(
                filteredItems.subList(fromIndex, toIndex),
                new ProjectPageResponse(query.page(), query.size(), filteredItems.size(), totalPages)
        );
    }

    @Transactional
    public ProjectBasicResponse create(UUID accountId, ProjectCreateCommand command) {
        validatePeriod(command.startDate(), command.targetEndDate());
        Account account = accountRepository.getReferenceById(accountId);
        Instant now = clock.instant();
        Project project = Project.create(
                account,
                normalizeName(command.name()),
                normalizeDescription(command.description()),
                command.startDate(),
                command.targetEndDate(),
                now
        );
        return ProjectBasicResponse.from(projectRepository.save(project));
    }

    @Transactional(readOnly = true)
    public ProjectBasicResponse get(UUID accountId, UUID projectId) {
        return ProjectBasicResponse.from(findOwnedProject(accountId, projectId));
    }

    @Transactional
    public ProjectBasicResponse update(UUID accountId, UUID projectId, ProjectUpdateCommand command) {
        validatePeriod(command.startDate(), command.targetEndDate());
        ProjectStatus newStatus = ProjectStatus.parse(command.status());
        Project project = findOwnedProject(accountId, projectId);
        if (project.status() != ProjectStatus.COMPLETED && newStatus == ProjectStatus.COMPLETED) {
            validateCanComplete(project.id());
        }

        LocalDate oldStartDate = project.startDate();
        LocalDate oldTargetEndDate = project.targetEndDate();
        Instant now = clock.instant();
        project.update(
                normalizeName(command.name()),
                normalizeDescription(command.description()),
                command.startDate(),
                command.targetEndDate(),
                newStatus,
                now
        );
        if (!Objects.equals(oldStartDate, command.startDate())
                || !Objects.equals(oldTargetEndDate, command.targetEndDate())) {
            projectPeriodHistoryRepository.save(ProjectPeriodHistory.record(
                    project,
                    oldStartDate,
                    command.startDate(),
                    oldTargetEndDate,
                    command.targetEndDate(),
                    accountRepository.getReferenceById(accountId),
                    now
            ));
        }
        return ProjectBasicResponse.from(project);
    }

    @Transactional
    public void delete(UUID accountId, UUID projectId) {
        Project project = findOwnedProject(accountId, projectId);
        projectQueryRepository.deleteProjectData(project.id());
        projectRepository.delete(project);
    }

    private Project findOwnedProject(UUID accountId, UUID projectId) {
        return projectRepository.findByIdAndAccount_Id(projectId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "PROJECT_NOT_FOUND",
                        "対象のプロジェクトが見つかりません。"
                ));
    }

    private void validateCanComplete(UUID projectId) {
        if (!projectQueryRepository.completionStats(projectId).canComplete()) {
            throw new BusinessConflictException(
                    "PROJECT_COMPLETION_NOT_ALLOWED",
                    "完了条件を満たしていないため、プロジェクトを完了にできません。"
            );
        }
    }

    private void validatePeriod(LocalDate startDate, LocalDate targetEndDate) {
        if (startDate.isAfter(targetEndDate)) {
            throw new InvalidRequestException("INVALID_PROJECT_PERIOD", "開始日は目標終了日以前にしてください。");
        }
    }

    private String normalizeName(String name) {
        return name.trim();
    }

    private String normalizeDescription(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }
        return description.trim();
    }

    private ProjectStatus parseOptionalStatus(String rawStatus) {
        if (rawStatus == null || rawStatus.isBlank()) {
            return null;
        }
        return ProjectStatus.parseQuery(rawStatus);
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        return Normalizer.normalize(keyword.trim(), Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
    }

    private boolean matchesKeyword(Project project, String keyword) {
        if (keyword == null) {
            return true;
        }
        return contains(project.name(), keyword) || contains(project.description(), keyword);
    }

    private boolean contains(String value, String keyword) {
        return value != null
                && Normalizer.normalize(value, Normalizer.Form.NFKC).toLowerCase(Locale.ROOT).contains(keyword);
    }

    private int clampedOffset(int page, int size, int totalElements) {
        long offset = (long) page * size;
        if (offset >= totalElements) {
            return totalElements;
        }
        return (int) offset;
    }

    private Comparator<ProjectListItemResponse> comparator(ProjectSort sort) {
        return switch (sort) {
            case UPDATED_AT_ASC -> Comparator.comparing(ProjectListItemResponse::updatedAt)
                    .thenComparing(ProjectListItemResponse::projectId);
            case UPDATED_AT_DESC -> Comparator.comparing(ProjectListItemResponse::updatedAt)
                    .reversed()
                    .thenComparing(ProjectListItemResponse::projectId);
            case START_DATE_ASC -> Comparator.comparing(ProjectListItemResponse::startDate)
                    .thenComparing(ProjectListItemResponse::updatedAt, Comparator.reverseOrder())
                    .thenComparing(ProjectListItemResponse::projectId);
            case START_DATE_DESC -> Comparator.comparing(ProjectListItemResponse::startDate)
                    .reversed()
                    .thenComparing(ProjectListItemResponse::updatedAt, Comparator.reverseOrder())
                    .thenComparing(ProjectListItemResponse::projectId);
            case TARGET_END_DATE_ASC -> Comparator.comparing(ProjectListItemResponse::targetEndDate)
                    .thenComparing(ProjectListItemResponse::updatedAt, Comparator.reverseOrder())
                    .thenComparing(ProjectListItemResponse::projectId);
            case TARGET_END_DATE_DESC -> Comparator.comparing(ProjectListItemResponse::targetEndDate)
                    .reversed()
                    .thenComparing(ProjectListItemResponse::updatedAt, Comparator.reverseOrder())
                    .thenComparing(ProjectListItemResponse::projectId);
            case PROGRESS_RATE_ASC -> progressComparator(false);
            case PROGRESS_RATE_DESC -> progressComparator(true);
        };
    }

    private Comparator<ProjectListItemResponse> progressComparator(boolean isDescending) {
        Comparator<ProjectListItemResponse> progress = Comparator.comparing(
                ProjectListItemResponse::progressRate,
                Comparator.nullsLast(Comparator.naturalOrder())
        );
        if (isDescending) {
            progress = Comparator.comparing(
                    ProjectListItemResponse::progressRate,
                    Comparator.nullsLast(Comparator.reverseOrder())
            );
        }
        return progress
                .thenComparing(ProjectListItemResponse::updatedAt, Comparator.reverseOrder())
                .thenComparing(ProjectListItemResponse::projectId);
    }
}
