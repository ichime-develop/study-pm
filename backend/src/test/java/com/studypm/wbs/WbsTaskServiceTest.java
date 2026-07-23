package com.studypm.wbs;

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
import java.util.Map;
import java.util.Optional;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * WbsTaskServiceの階層制約、履歴追加、削除可否、完了差し戻しを検証する。
 */
class WbsTaskServiceTest {

    private final ProjectRepository projectRepository = mock(ProjectRepository.class);
    private final ProjectQueryRepository projectQueryRepository = mock(ProjectQueryRepository.class);
    private final WbsTaskRepository wbsTaskRepository = mock(WbsTaskRepository.class);
    private final WbsTaskPlanHistoryRepository planHistoryRepository = mock(WbsTaskPlanHistoryRepository.class);
    private final WbsTaskProgressHistoryRepository progressHistoryRepository = mock(WbsTaskProgressHistoryRepository.class);
    private final WbsQueryRepository wbsQueryRepository = mock(WbsQueryRepository.class);
    private final AccountRepository accountRepository = mock(AccountRepository.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-07-23T00:00:00Z"), ZoneOffset.UTC);

    private WbsTaskService service;
    private Account account;
    private Project project;
    private UUID accountId;

    @BeforeEach
    void setUp() {
        service = new WbsTaskService(
                projectRepository,
                projectQueryRepository,
                wbsTaskRepository,
                planHistoryRepository,
                progressHistoryRepository,
                wbsQueryRepository,
                accountRepository,
                clock
        );
        account = Account.create("user@example.com", "encoded", "User", clock.instant());
        accountId = account.id();
        project = Project.create(
                account,
                "Java",
                null,
                LocalDate.parse("2026-08-01"),
                LocalDate.parse("2026-09-01"),
                clock.instant()
        );
    }

    @Test
    void createLeafSetsProgressZeroAndRecordsInitialProgressHistory() {
        when(projectRepository.findByIdAndAccount_Id(project.id(), accountId)).thenReturn(Optional.of(project));
        when(accountRepository.getReferenceById(accountId)).thenReturn(account);
        when(wbsTaskRepository.save(any(WbsTask.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(wbsQueryRepository.metricsFor(any())).thenReturn(Map.of());

        WbsTaskResponse response = service.create(
                accountId,
                project.id(),
                new WbsTaskCreateCommand(
                        "LEAF",
                        " Task ",
                        null,
                        null,
                        LocalDate.parse("2026-08-01"),
                        LocalDate.parse("2026-08-31"),
                        new BigDecimal("1.25")
                )
        );

        assertThat(response.name()).isEqualTo("Task");
        assertThat(response.progressRate()).isZero();
        verify(progressHistoryRepository).save(any(WbsTaskProgressHistory.class));
    }

    @Test
    void summaryReturnsProjectAggregateValues() {
        when(projectRepository.findByIdAndAccount_Id(project.id(), accountId)).thenReturn(Optional.of(project));
        when(projectQueryRepository.aggregateFor(project.id(), LocalDate.parse("2026-07-23")))
                .thenReturn(new ProjectAggregate(
                        2,
                        new BigDecimal("3.00"),
                        new BigDecimal("1.50"),
                        new BigDecimal("0.75"),
                        new BigDecimal("25.0000"),
                        true
                ));

        WbsSummaryResponse response = service.summary(accountId, project.id());

        assertThat(response.projectId()).isEqualTo(project.id());
        assertThat(response.plannedHours()).isEqualByComparingTo("3.00");
        assertThat(response.actualHours()).isEqualByComparingTo("1.50");
        assertThat(response.progressRate()).isEqualByComparingTo("25.0000");
        assertThat(response.hasDelay()).isTrue();
    }

    @Test
    void summaryReturnsEmptyAggregateForProjectWithoutLeafTasks() {
        when(projectRepository.findByIdAndAccount_Id(project.id(), accountId)).thenReturn(Optional.of(project));
        when(projectQueryRepository.aggregateFor(project.id(), LocalDate.parse("2026-07-23")))
                .thenReturn(new ProjectAggregate(0, null, BigDecimal.ZERO, BigDecimal.ZERO, null, false));

        WbsSummaryResponse response = service.summary(accountId, project.id());

        assertThat(response.projectId()).isEqualTo(project.id());
        assertThat(response.plannedHours()).isNull();
        assertThat(response.actualHours()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.progressRate()).isNull();
        assertThat(response.hasDelay()).isFalse();
    }

    @Test
    void summaryRejectsOtherAccountProjectAsNotFound() {
        when(projectRepository.findByIdAndAccount_Id(project.id(), accountId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.summary(accountId, project.id()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("対象のプロジェクトが見つかりません。");
    }

    @Test
    void createRejectsLeafUnderLeafAsHierarchyConflict() {
        WbsTask leafParent = leaf(null);
        when(projectRepository.findByIdAndAccount_Id(project.id(), accountId)).thenReturn(Optional.of(project));
        when(wbsTaskRepository.findByIdAndProject_IdAndProject_Account_Id(leafParent.id(), project.id(), accountId))
                .thenReturn(Optional.of(leafParent));

        assertThatThrownBy(() -> service.create(
                accountId,
                project.id(),
                new WbsTaskCreateCommand(
                        "LEAF",
                        "Child",
                        null,
                        leafParent.id(),
                        null,
                        null,
                        new BigDecimal("1.00")
                )
        ))
                .isInstanceOf(BusinessConflictException.class)
                .hasMessage("タスク配下にタスクは作成できません。");
    }

    @Test
    void updateLeafRecordsPlanHistoryOnlyWhenPlanChanged() {
        WbsTask task = leaf(null);
        when(wbsTaskRepository.findByIdAndProject_Account_Id(task.id(), accountId)).thenReturn(Optional.of(task));
        when(accountRepository.getReferenceById(accountId)).thenReturn(account);
        when(wbsQueryRepository.metricsFor(any())).thenReturn(Map.of());

        service.update(
                accountId,
                task.id(),
                new WbsTaskUpdateCommand(
                        "Updated",
                        null,
                        null,
                        LocalDate.parse("2026-08-02"),
                        LocalDate.parse("2026-09-02"),
                        new BigDecimal("2.00")
                )
        );

        verify(planHistoryRepository).save(any(WbsTaskPlanHistory.class));
    }

    @Test
    void updateProgressDoesNotRecordHistoryWhenValueIsSame() {
        WbsTask task = leaf(null);
        when(wbsTaskRepository.findByIdAndProject_Account_Id(task.id(), accountId)).thenReturn(Optional.of(task));
        when(wbsQueryRepository.metricsFor(any())).thenReturn(Map.of());

        WbsProgressUpdateResponse response = service.updateProgress(
                accountId,
                task.id(),
                new WbsProgressUpdateCommand(0)
        );

        assertThat(response.historyAdded()).isFalse();
        verify(progressHistoryRepository, never()).save(any(WbsTaskProgressHistory.class));
    }

    @Test
    void updateProgressReopensCompletedProjectWhenProgressDropsBelowHundred() {
        WbsTask task = leaf(null);
        task.updateProgress(100, clock.instant());
        project.changeStatus(ProjectStatus.COMPLETED, clock.instant());
        when(wbsTaskRepository.findByIdAndProject_Account_Id(task.id(), accountId)).thenReturn(Optional.of(task));
        when(accountRepository.getReferenceById(accountId)).thenReturn(account);
        when(wbsQueryRepository.metricsFor(any())).thenReturn(Map.of());

        WbsProgressUpdateResponse response = service.updateProgress(
                accountId,
                task.id(),
                new WbsProgressUpdateCommand(90)
        );

        assertThat(response.historyAdded()).isTrue();
        assertThat(project.status()).isEqualTo(ProjectStatus.IN_PROGRESS);
        verify(progressHistoryRepository).save(any(WbsTaskProgressHistory.class));
    }

    @Test
    void deleteRejectsLeafWithStudyLogs() {
        WbsTask task = leaf(null);
        when(wbsTaskRepository.findByIdAndProject_Account_Id(task.id(), accountId)).thenReturn(Optional.of(task));
        when(wbsQueryRepository.hasStudyLogs(task.id())).thenReturn(true);

        assertThatThrownBy(() -> service.delete(accountId, task.id()))
                .isInstanceOf(BusinessConflictException.class)
                .hasMessage("学習記録があるタスクは削除できません。");
    }

    @Test
    void deleteRejectsParentWhenChildHasStudyLogs() {
        WbsTask parent = parent();
        when(wbsTaskRepository.findByIdAndProject_Account_Id(parent.id(), accountId)).thenReturn(Optional.of(parent));
        when(wbsQueryRepository.hasStudyLogsUnderParent(parent.id())).thenReturn(true);

        assertThatThrownBy(() -> service.delete(accountId, parent.id()))
                .isInstanceOf(BusinessConflictException.class)
                .hasMessage("学習記録があるタスクを含む親タスクは削除できません。");
    }

    @Test
    void deleteParentDeletesChildrenBeforeParent() {
        WbsTask parent = parent();
        WbsTask child = leaf(parent);
        when(wbsTaskRepository.findByIdAndProject_Account_Id(parent.id(), accountId)).thenReturn(Optional.of(parent));
        when(wbsTaskRepository.findAllByParentWbsTask_Id(parent.id())).thenReturn(List.of(child));

        service.delete(accountId, parent.id());

        verify(wbsTaskRepository).deleteAll(List.of(child));
        verify(wbsTaskRepository).flush();
        verify(wbsTaskRepository).delete(parent);
    }

    @Test
    void invalidProgressRateIsRejected() {
        assertThatThrownBy(() -> service.updateProgress(accountId, UUID.randomUUID(), new WbsProgressUpdateCommand(55)))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("進捗率は0から100までの10刻みで指定してください。");
    }

    @Test
    void plannedHoursOverDatabaseLimitIsRejectedBeforePersistence() {
        when(projectRepository.findByIdAndAccount_Id(project.id(), accountId)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> service.create(
                accountId,
                project.id(),
                new WbsTaskCreateCommand(
                        "LEAF",
                        "Too Large",
                        null,
                        null,
                        null,
                        null,
                        new BigDecimal("10000.00")
                )
        ))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("予定工数は0.25時間以上9999.99時間以下、0.25時間単位で指定してください。");
    }

    private WbsTask parent() {
        return WbsTask.createParent(project, "Parent", null, clock.instant());
    }

    private WbsTask leaf(WbsTask parent) {
        return WbsTask.createLeaf(
                project,
                parent,
                "Leaf",
                null,
                LocalDate.parse("2026-08-01"),
                LocalDate.parse("2026-09-01"),
                BigDecimal.TEN,
                clock.instant()
        );
    }
}
