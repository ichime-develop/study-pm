package com.studypm.wbs;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import com.studypm.account.Account;
import com.studypm.account.AccountRepository;
import com.studypm.common.error.BusinessConflictException;
import com.studypm.common.error.InvalidRequestException;
import com.studypm.common.error.ResourceNotFoundException;
import com.studypm.project.Project;
import com.studypm.project.ProjectAggregate;
import com.studypm.project.ProjectQueryRepository;
import com.studypm.project.ProjectRepository;
import com.studypm.project.ProjectStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * WBS階層制約、計画履歴、進捗履歴、削除可否を制御する。
 */
@Service
public class WbsTaskService {

    private static final ZoneId JST = ZoneId.of("Asia/Tokyo");
    private static final BigDecimal MIN_PLANNED_HOURS = new BigDecimal("0.25");
    private static final BigDecimal MAX_PLANNED_HOURS = new BigDecimal("9999.99");

    private final ProjectRepository projectRepository;
    private final ProjectQueryRepository projectQueryRepository;
    private final WbsTaskRepository wbsTaskRepository;
    private final WbsTaskPlanHistoryRepository planHistoryRepository;
    private final WbsTaskProgressHistoryRepository progressHistoryRepository;
    private final WbsQueryRepository wbsQueryRepository;
    private final AccountRepository accountRepository;
    private final Clock clock;

    public WbsTaskService(
            ProjectRepository projectRepository,
            ProjectQueryRepository projectQueryRepository,
            WbsTaskRepository wbsTaskRepository,
            WbsTaskPlanHistoryRepository planHistoryRepository,
            WbsTaskProgressHistoryRepository progressHistoryRepository,
            WbsQueryRepository wbsQueryRepository,
            AccountRepository accountRepository,
            Clock clock
    ) {
        this.projectRepository = projectRepository;
        this.projectQueryRepository = projectQueryRepository;
        this.wbsTaskRepository = wbsTaskRepository;
        this.planHistoryRepository = planHistoryRepository;
        this.progressHistoryRepository = progressHistoryRepository;
        this.wbsQueryRepository = wbsQueryRepository;
        this.accountRepository = accountRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public WbsListResponse list(UUID accountId, UUID projectId) {
        Project project = findOwnedProject(accountId, projectId);
        List<WbsTask> tasks = wbsTaskRepository.findAllByProject_IdAndProject_Account_Id(projectId, accountId);
        Map<UUID, WbsTaskMetrics> metrics = metricsFor(tasks);
        ProjectAggregate aggregate = projectQueryRepository.aggregateFor(projectId, LocalDate.now(clock.withZone(JST)));
        return new WbsListResponse(
                project.id(),
                project.startDate(),
                project.targetEndDate(),
                aggregate.plannedHours(),
                aggregate.actualHours(),
                aggregate.progressRate(),
                aggregate.hasDelay(),
                sortedTasks(tasks).stream()
                        .map(task -> WbsTaskResponse.from(task, metrics))
                        .toList()
        );
    }

    @Transactional
    public WbsTaskResponse create(UUID accountId, UUID projectId, WbsTaskCreateCommand command) {
        Project project = findOwnedProject(accountId, projectId);
        WbsTaskType taskType = WbsTaskType.parse(command.taskType());
        String name = normalizeName(command.name());
        String description = normalizeDescription(command.description());
        Account account = accountRepository.getReferenceById(accountId);
        var now = clock.instant();

        WbsTask task;
        if (taskType == WbsTaskType.PARENT) {
            validateParentCommand(command);
            task = wbsTaskRepository.save(WbsTask.createParent(project, name, description, now));
        } else {
            validateLeafPlan(command.plannedStartDate(), command.plannedEndDate(), command.plannedHours());
            WbsTask parent = resolveParent(accountId, projectId, command.parentTaskId());
            task = wbsTaskRepository.save(WbsTask.createLeaf(
                    project,
                    parent,
                    name,
                    description,
                    command.plannedStartDate(),
                    command.plannedEndDate(),
                    command.plannedHours(),
                    now
            ));
            progressHistoryRepository.save(WbsTaskProgressHistory.record(task, 0, account, now));
        }
        return responseFor(task);
    }

    @Transactional(readOnly = true)
    public WbsTaskResponse get(UUID accountId, UUID taskId) {
        return responseFor(findOwnedTask(accountId, taskId));
    }

    @Transactional
    public WbsTaskResponse update(UUID accountId, UUID taskId, WbsTaskUpdateCommand command) {
        WbsTask task = findOwnedTask(accountId, taskId);
        String name = normalizeName(command.name());
        String description = normalizeDescription(command.description());
        var now = clock.instant();

        if (task.isParent()) {
            validateParentUpdateCommand(command);
            task.updateParent(name, description, now);
            return responseFor(task);
        }

        validateLeafPlan(command.plannedStartDate(), command.plannedEndDate(), command.plannedHours());
        WbsTask oldParent = task.parentWbsTask();
        LocalDate oldStartDate = task.plannedStartDate();
        LocalDate oldEndDate = task.plannedEndDate();
        BigDecimal oldHours = task.plannedHours();
        WbsTask newParent = resolveParent(accountId, task.project().id(), command.parentTaskId());
        boolean hasPlanChanged = !Objects.equals(parentId(oldParent), parentId(newParent))
                || !Objects.equals(oldStartDate, command.plannedStartDate())
                || !Objects.equals(oldEndDate, command.plannedEndDate())
                || !sameAmount(oldHours, command.plannedHours());

        task.updateLeaf(
                newParent,
                name,
                description,
                command.plannedStartDate(),
                command.plannedEndDate(),
                command.plannedHours(),
                now
        );
        if (hasPlanChanged) {
            planHistoryRepository.save(WbsTaskPlanHistory.record(
                    task,
                    oldParent,
                    newParent,
                    oldStartDate,
                    command.plannedStartDate(),
                    oldEndDate,
                    command.plannedEndDate(),
                    oldHours,
                    command.plannedHours(),
                    accountRepository.getReferenceById(accountId),
                    now
            ));
        }
        return responseFor(task);
    }

    @Transactional
    public WbsProgressUpdateResponse updateProgress(UUID accountId, UUID taskId, WbsProgressUpdateCommand command) {
        int progressRate = validateProgressRate(command.progressRate());
        WbsTask task = findOwnedTask(accountId, taskId);
        if (task.isParent()) {
            throw new InvalidRequestException("INVALID_WBS_PROGRESS_TARGET", "親タスクの進捗率は更新できません。");
        }
        if (task.progressRate() == progressRate) {
            return new WbsProgressUpdateResponse(responseFor(task), false);
        }

        var now = clock.instant();
        task.updateProgress(progressRate, now);
        progressHistoryRepository.save(WbsTaskProgressHistory.record(
                task,
                progressRate,
                accountRepository.getReferenceById(accountId),
                now
        ));
        if (task.project().status() == ProjectStatus.COMPLETED && progressRate < 100) {
            task.project().changeStatus(ProjectStatus.IN_PROGRESS, now);
        }
        return new WbsProgressUpdateResponse(responseFor(task), true);
    }

    @Transactional
    public void delete(UUID accountId, UUID taskId) {
        WbsTask task = findOwnedTask(accountId, taskId);
        if (task.isLeaf()) {
            validateLeafCanBeDeleted(task.id());
            wbsTaskRepository.delete(task);
            return;
        }

        if (wbsQueryRepository.hasStudyLogsUnderParent(task.id())) {
            throw new BusinessConflictException(
                    "PARENT_HAS_STUDY_LOGS",
                    "学習記録があるタスクを含む親タスクは削除できません。"
            );
        }
        List<WbsTask> children = wbsTaskRepository.findAllByParentWbsTask_Id(task.id());
        wbsTaskRepository.deleteAll(children);
        wbsTaskRepository.flush();
        wbsTaskRepository.delete(task);
    }

    private Project findOwnedProject(UUID accountId, UUID projectId) {
        return projectRepository.findByIdAndAccount_Id(projectId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "PROJECT_NOT_FOUND",
                        "対象のプロジェクトが見つかりません。"
                ));
    }

    private WbsTask findOwnedTask(UUID accountId, UUID taskId) {
        return wbsTaskRepository.findByIdAndProject_Account_Id(taskId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "WBS_TASK_NOT_FOUND",
                        "対象のWBSタスクが見つかりません。"
                ));
    }

    private WbsTask resolveParent(UUID accountId, UUID projectId, UUID parentTaskId) {
        if (parentTaskId == null) {
            return null;
        }
        WbsTask parent = wbsTaskRepository.findByIdAndProject_IdAndProject_Account_Id(parentTaskId, projectId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "WBS_TASK_NOT_FOUND",
                        "対象のWBSタスクが見つかりません。"
                ));
        if (parent.isLeaf()) {
            throw new BusinessConflictException("WBS_HIERARCHY_CONFLICT", "タスク配下にタスクは作成できません。");
        }
        return parent;
    }

    private void validateLeafCanBeDeleted(UUID taskId) {
        if (wbsQueryRepository.hasStudyLogs(taskId)) {
            throw new BusinessConflictException("TASK_HAS_STUDY_LOGS", "学習記録があるタスクは削除できません。");
        }
    }

    private void validateParentCommand(WbsTaskCreateCommand command) {
        if (command.parentTaskId() != null
                || command.plannedStartDate() != null
                || command.plannedEndDate() != null
                || command.plannedHours() != null) {
            throw new InvalidRequestException("INVALID_PARENT_TASK_PLAN", "親タスクには親タスク、予定日、予定工数を指定できません。");
        }
    }

    private void validateParentUpdateCommand(WbsTaskUpdateCommand command) {
        if (command.parentTaskId() != null
                || command.plannedStartDate() != null
                || command.plannedEndDate() != null
                || command.plannedHours() != null) {
            throw new InvalidRequestException("INVALID_PARENT_TASK_PLAN", "親タスクには親タスク、予定日、予定工数を指定できません。");
        }
    }

    private void validateLeafPlan(LocalDate plannedStartDate, LocalDate plannedEndDate, BigDecimal plannedHours) {
        if (plannedStartDate != null && plannedEndDate != null && plannedStartDate.isAfter(plannedEndDate)) {
            throw new InvalidRequestException("INVALID_WBS_PLAN_DATES", "開始予定日は終了予定日以前にしてください。");
        }
        if (plannedHours == null
                || plannedHours.compareTo(MIN_PLANNED_HOURS) < 0
                || plannedHours.compareTo(MAX_PLANNED_HOURS) > 0
                || plannedHours.multiply(new BigDecimal("4")).stripTrailingZeros().scale() > 0) {
            throw new InvalidRequestException("INVALID_WBS_PLANNED_HOURS", "予定工数は0.25時間以上9999.99時間以下、0.25時間単位で指定してください。");
        }
    }

    private int validateProgressRate(Integer progressRate) {
        if (progressRate == null || progressRate < 0 || progressRate > 100 || progressRate % 10 != 0) {
            throw new InvalidRequestException("INVALID_WBS_PROGRESS_RATE", "進捗率は0から100までの10刻みで指定してください。");
        }
        return progressRate;
    }

    private String normalizeName(String name) {
        String normalized = name.trim();
        if (normalized.isEmpty() || normalized.length() > 100) {
            throw new InvalidRequestException("INVALID_WBS_TASK_NAME", "WBSタスク名は1文字以上100文字以内で指定してください。");
        }
        return normalized;
    }

    private String normalizeDescription(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }
        return description.trim();
    }

    private WbsTaskResponse responseFor(WbsTask task) {
        return WbsTaskResponse.from(task, metricsFor(List.of(task)));
    }

    private Map<UUID, WbsTaskMetrics> metricsFor(List<WbsTask> tasks) {
        return wbsQueryRepository.metricsFor(tasks.stream()
                .filter(WbsTask::isLeaf)
                .map(WbsTask::id)
                .toList());
    }

    private List<WbsTask> sortedTasks(List<WbsTask> tasks) {
        List<WbsTask> rootTasks = tasks.stream()
                .filter(task -> task.parentWbsTask() == null)
                .sorted(Comparator.comparing(task -> displayKey(task, tasks)))
                .toList();
        return rootTasks.stream()
                .flatMap(task -> {
                    if (task.isLeaf()) {
                        return java.util.stream.Stream.of(task);
                    }
                    return java.util.stream.Stream.concat(
                            java.util.stream.Stream.of(task),
                            tasks.stream()
                                    .filter(child -> Objects.equals(child.parentTaskId(), task.id()))
                                    .sorted(Comparator.comparing(this::leafDisplayKey))
                    );
                })
                .toList();
    }

    private WbsDisplayKey displayKey(WbsTask task, List<WbsTask> allTasks) {
        if (task.isLeaf()) {
            return leafDisplayKey(task);
        }
        List<WbsTask> children = allTasks.stream()
                .filter(child -> Objects.equals(child.parentTaskId(), task.id()))
                .toList();
        LocalDate startDate = children.stream()
                .map(WbsTask::plannedStartDate)
                .filter(Objects::nonNull)
                .min(LocalDate::compareTo)
                .orElse(null);
        LocalDate endDate = children.stream()
                .map(WbsTask::plannedEndDate)
                .filter(Objects::nonNull)
                .min(LocalDate::compareTo)
                .orElse(null);
        return WbsDisplayKey.from(startDate, endDate, task.createdAt(), task.id());
    }

    private WbsDisplayKey leafDisplayKey(WbsTask task) {
        return WbsDisplayKey.from(task.plannedStartDate(), task.plannedEndDate(), task.createdAt(), task.id());
    }

    private UUID parentId(WbsTask task) {
        return task == null ? null : task.id();
    }

    private boolean sameAmount(BigDecimal left, BigDecimal right) {
        return left != null && right != null && left.compareTo(right) == 0;
    }

    private record WbsDisplayKey(
            int dateRank,
            LocalDate startDate,
            LocalDate endDate,
            java.time.Instant createdAt,
            UUID taskId
    ) implements Comparable<WbsDisplayKey> {

        static WbsDisplayKey from(LocalDate startDate, LocalDate endDate, java.time.Instant createdAt, UUID taskId) {
            int dateRank = startDate != null ? 0 : endDate != null ? 1 : 2;
            return new WbsDisplayKey(dateRank, startDate, endDate, createdAt, taskId);
        }

        @Override
        public int compareTo(WbsDisplayKey other) {
            int compared = Integer.compare(dateRank, other.dateRank);
            if (compared != 0) {
                return compared;
            }
            compared = compareNullable(startDate, other.startDate);
            if (compared != 0) {
                return compared;
            }
            compared = compareNullable(endDate, other.endDate);
            if (compared != 0) {
                return compared;
            }
            compared = createdAt.compareTo(other.createdAt);
            if (compared != 0) {
                return compared;
            }
            return taskId.compareTo(other.taskId);
        }

        private static <T extends Comparable<T>> int compareNullable(T left, T right) {
            if (left == null && right == null) {
                return 0;
            }
            if (left == null) {
                return 1;
            }
            if (right == null) {
                return -1;
            }
            return left.compareTo(right);
        }
    }
}
