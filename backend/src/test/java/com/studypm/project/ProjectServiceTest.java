package com.studypm.project;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.studypm.account.Account;
import com.studypm.account.AccountRepository;
import com.studypm.common.error.BusinessConflictException;
import com.studypm.common.error.InvalidRequestException;
import com.studypm.common.error.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * ProjectServiceの状態遷移、期間履歴、所有者判定を検証する。
 */
class ProjectServiceTest {

    private final ProjectRepository projectRepository = mock(ProjectRepository.class);
    private final ProjectPeriodHistoryRepository projectPeriodHistoryRepository =
            mock(ProjectPeriodHistoryRepository.class);
    private final ProjectQueryRepository projectQueryRepository = mock(ProjectQueryRepository.class);
    private final AccountRepository accountRepository = mock(AccountRepository.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-07-23T00:00:00Z"), ZoneOffset.UTC);

    private ProjectService projectService;
    private Account account;
    private UUID accountId;

    @BeforeEach
    void setUp() {
        projectService = new ProjectService(
                projectRepository,
                projectPeriodHistoryRepository,
                projectQueryRepository,
                accountRepository,
                clock
        );
        account = Account.create("user@example.com", "encoded", "User", clock.instant());
        accountId = account.id();
    }

    @Test
    void createSetsNotStartedAndTimestamps() {
        when(accountRepository.getReferenceById(accountId)).thenReturn(account);
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProjectBasicResponse response = projectService.create(
                accountId,
                new ProjectCreateCommand(" Java ", " backend ", LocalDate.parse("2026-08-01"), LocalDate.parse("2026-09-01"))
        );

        assertThat(response.name()).isEqualTo("Java");
        assertThat(response.description()).isEqualTo("backend");
        assertThat(response.status()).isEqualTo(ProjectStatus.NOT_STARTED);
        assertThat(response.createdAt()).isEqualTo(clock.instant());
        assertThat(response.updatedAt()).isEqualTo(clock.instant());
    }

    @Test
    void createRejectsInvalidPeriod() {
        assertThatThrownBy(() -> projectService.create(
                accountId,
                new ProjectCreateCommand("Java", null, LocalDate.parse("2026-09-01"), LocalDate.parse("2026-08-01"))
        ))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("開始日は目標終了日以前にしてください。");
    }

    @Test
    void updateRecordsPeriodHistoryOnlyWhenPeriodChanged() {
        Project project = project();
        when(projectRepository.findByIdAndAccount_Id(project.id(), accountId)).thenReturn(Optional.of(project));
        when(accountRepository.getReferenceById(accountId)).thenReturn(account);

        ProjectBasicResponse response = projectService.update(
                accountId,
                project.id(),
                new ProjectUpdateCommand(
                        "Java Updated",
                        "new",
                        LocalDate.parse("2026-08-02"),
                        LocalDate.parse("2026-09-02"),
                        "IN_PROGRESS"
                )
        );

        assertThat(response.startDate()).isEqualTo(LocalDate.parse("2026-08-02"));
        ArgumentCaptor<ProjectPeriodHistory> captor = ArgumentCaptor.forClass(ProjectPeriodHistory.class);
        verify(projectPeriodHistoryRepository).save(captor.capture());
        assertThat(captor.getValue().oldStartDate()).isEqualTo(LocalDate.parse("2026-08-01"));
        assertThat(captor.getValue().newStartDate()).isEqualTo(LocalDate.parse("2026-08-02"));
        assertThat(captor.getValue().oldTargetEndDate()).isEqualTo(LocalDate.parse("2026-09-01"));
        assertThat(captor.getValue().newTargetEndDate()).isEqualTo(LocalDate.parse("2026-09-02"));
    }

    @Test
    void updateDoesNotRecordPeriodHistoryWhenOnlyNameAndStatusChanged() {
        Project project = project();
        when(projectRepository.findByIdAndAccount_Id(project.id(), accountId)).thenReturn(Optional.of(project));

        projectService.update(
                accountId,
                project.id(),
                new ProjectUpdateCommand(
                        "Java Updated",
                        null,
                        LocalDate.parse("2026-08-01"),
                        LocalDate.parse("2026-09-01"),
                        "IN_PROGRESS"
                )
        );

        verify(projectPeriodHistoryRepository, never()).save(any(ProjectPeriodHistory.class));
    }

    @Test
    void updateRejectsCompletionWhenLeafTasksAreNotAllCompleted() {
        Project project = project();
        when(projectRepository.findByIdAndAccount_Id(project.id(), accountId)).thenReturn(Optional.of(project));
        when(projectQueryRepository.completionStats(project.id())).thenReturn(new ProjectCompletionStats(2, 1));

        assertThatThrownBy(() -> projectService.update(
                accountId,
                project.id(),
                new ProjectUpdateCommand(
                        project.name(),
                        project.description(),
                        project.startDate(),
                        project.targetEndDate(),
                        "COMPLETED"
                )
        ))
                .isInstanceOf(BusinessConflictException.class)
                .hasMessage("完了条件を満たしていないため、プロジェクトを完了にできません。");
    }

    @Test
    void updateAllowsCompletionWhenAllLeafTasksAreCompleted() {
        Project project = project();
        when(projectRepository.findByIdAndAccount_Id(project.id(), accountId)).thenReturn(Optional.of(project));
        when(projectQueryRepository.completionStats(project.id())).thenReturn(new ProjectCompletionStats(2, 2));

        ProjectBasicResponse response = projectService.update(
                accountId,
                project.id(),
                new ProjectUpdateCommand(
                        project.name(),
                        project.description(),
                        project.startDate(),
                        project.targetEndDate(),
                        "COMPLETED"
                )
        );

        assertThat(response.status()).isEqualTo(ProjectStatus.COMPLETED);
    }

    @Test
    void getRejectsProjectOwnedByAnotherAccountAsNotFound() {
        UUID projectId = UUID.randomUUID();
        when(projectRepository.findByIdAndAccount_Id(projectId, accountId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.get(accountId, projectId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("対象のプロジェクトが見つかりません。");
    }

    @Test
    void overviewReturnsMetricsWarningsContinuousDaysAndIncompleteTasks() {
        Project project = project();
        ProjectOverviewTaskRow delayedTask = new ProjectOverviewTaskRow(
                UUID.randomUUID(),
                "Delayed",
                LocalDate.parse("2026-07-22"),
                50,
                true
        );
        ProjectOverviewTaskRow upcomingTask = new ProjectOverviewTaskRow(
                UUID.randomUUID(),
                "Upcoming",
                LocalDate.parse("2026-08-01"),
                0,
                false
        );
        when(projectRepository.findByIdAndAccount_Id(project.id(), accountId)).thenReturn(Optional.of(project));
        when(projectQueryRepository.aggregateFor(project.id(), LocalDate.parse("2026-07-23")))
                .thenReturn(new ProjectAggregate(
                        2,
                        new BigDecimal("10.00"),
                        new BigDecimal("12.00"),
                        new BigDecimal("4.00"),
                        new BigDecimal("40.0000"),
                        true
                ));
        when(projectQueryRepository.distinctStudyDatesForProject(project.id())).thenReturn(List.of(
                LocalDate.parse("2026-07-23"),
                LocalDate.parse("2026-07-22"),
                LocalDate.parse("2026-07-20")
        ));
        when(projectQueryRepository.incompleteTasksForOverview(project.id(), LocalDate.parse("2026-07-23")))
                .thenReturn(List.of(delayedTask, upcomingTask));

        ProjectOverviewResponse response = projectService.overview(accountId, project.id());

        assertThat(response.progressRate()).isEqualByComparingTo("40.0000");
        assertThat(response.plannedHours()).isEqualByComparingTo("10.00");
        assertThat(response.remainingPlannedHours()).isEqualByComparingTo("6.00");
        assertThat(response.projectStudyHours()).isEqualByComparingTo("12.00");
        assertThat(response.projectContinuousStudyDays()).isEqualTo(2);
        assertThat(response.warnings()).extracting(ProjectWarningResponse::code)
                .containsExactly("DELAYED_TASK_EXISTS", "EFFORT_OVERRUN");
        assertThat(response.incompleteTasks()).extracting(ProjectOverviewTaskResponse::name)
                .containsExactly("Delayed", "Upcoming");
    }

    @Test
    void overviewReturnsEmptyMetricsForProjectWithoutLeafTasks() {
        Project project = project();
        when(projectRepository.findByIdAndAccount_Id(project.id(), accountId)).thenReturn(Optional.of(project));
        when(projectQueryRepository.aggregateFor(project.id(), LocalDate.parse("2026-07-23")))
                .thenReturn(new ProjectAggregate(0, null, BigDecimal.ZERO, BigDecimal.ZERO, null, false));
        when(projectQueryRepository.distinctStudyDatesForProject(project.id())).thenReturn(List.of());
        when(projectQueryRepository.incompleteTasksForOverview(project.id(), LocalDate.parse("2026-07-23")))
                .thenReturn(List.of());

        ProjectOverviewResponse response = projectService.overview(accountId, project.id());

        assertThat(response.progressRate()).isNull();
        assertThat(response.plannedHours()).isNull();
        assertThat(response.remainingPlannedHours()).isNull();
        assertThat(response.projectStudyHours()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.projectContinuousStudyDays()).isZero();
        assertThat(response.warnings()).isEmpty();
        assertThat(response.incompleteTasks()).isEmpty();
    }

    @Test
    void listReturnsEmptyPageForHugePageWithoutOverflow() {
        Project project = project();
        when(projectRepository.findAllByAccount_Id(accountId)).thenReturn(List.of(project));
        when(projectQueryRepository.aggregateFor(project.id(), LocalDate.parse("2026-07-23")))
                .thenReturn(new ProjectAggregate(0, null, BigDecimal.ZERO, BigDecimal.ZERO, null, false));

        ProjectListResponse response = projectService.list(
                accountId,
                new ProjectListQuery(null, null, "updatedAtDesc", Integer.MAX_VALUE, 100)
        );

        assertThat(response.items()).isEmpty();
        assertThat(response.page().totalElements()).isEqualTo(1);
        assertThat(response.page().totalPages()).isEqualTo(1);
    }

    private Project project() {
        return Project.create(
                account,
                "Java",
                "backend",
                LocalDate.parse("2026-08-01"),
                LocalDate.parse("2026-09-01"),
                clock.instant()
        );
    }
}
