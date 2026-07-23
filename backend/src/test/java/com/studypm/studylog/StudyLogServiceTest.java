package com.studypm.studylog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import com.studypm.account.Account;
import com.studypm.account.AccountRepository;
import com.studypm.common.error.InvalidRequestException;
import com.studypm.common.error.ResourceNotFoundException;
import com.studypm.project.Project;
import com.studypm.project.ProjectRepository;
import com.studypm.wbs.WbsTask;
import com.studypm.wbs.WbsTaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * StudyLogServiceの所有者判定、入力制約、再計算サマリーを検証する。
 */
class StudyLogServiceTest {

    private final StudyLogRepository studyLogRepository = mock(StudyLogRepository.class);
    private final StudyLogQueryRepository studyLogQueryRepository = mock(StudyLogQueryRepository.class);
    private final ProjectRepository projectRepository = mock(ProjectRepository.class);
    private final WbsTaskRepository wbsTaskRepository = mock(WbsTaskRepository.class);
    private final AccountRepository accountRepository = mock(AccountRepository.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-07-23T00:00:00Z"), ZoneOffset.UTC);

    private StudyLogService studyLogService;
    private Account account;
    private Project project;
    private WbsTask leafTask;
    private UUID accountId;

    @BeforeEach
    void setUp() {
        studyLogService = new StudyLogService(
                studyLogRepository,
                studyLogQueryRepository,
                projectRepository,
                wbsTaskRepository,
                accountRepository,
                clock
        );
        account = Account.create("user@example.com", "encoded", "User", clock.instant());
        project = Project.create(
                account,
                "Java",
                null,
                LocalDate.parse("2026-07-01"),
                LocalDate.parse("2026-08-31"),
                clock.instant()
        );
        leafTask = WbsTask.createLeaf(
                project,
                null,
                "Spring",
                null,
                LocalDate.parse("2026-07-01"),
                LocalDate.parse("2026-07-31"),
                new BigDecimal("10.00"),
                clock.instant()
        );
        accountId = account.id();
    }

    @Test
    void createSavesAccountProjectAndLeafTask() {
        when(projectRepository.findByIdAndAccount_Id(project.id(), accountId)).thenReturn(Optional.of(project));
        when(wbsTaskRepository.findByIdAndProject_Account_Id(leafTask.id(), accountId)).thenReturn(Optional.of(leafTask));
        when(accountRepository.getReferenceById(accountId)).thenReturn(account);
        when(studyLogRepository.saveAndFlush(any(StudyLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(studyLogQueryRepository.actualHoursForProject(project.id())).thenReturn(new BigDecimal("1.25"));
        when(studyLogQueryRepository.actualHoursForTask(leafTask.id())).thenReturn(new BigDecimal("1.25"));

        StudyLogMutationResponse response = studyLogService.create(
                accountId,
                project.id(),
                new StudyLogCreateCommand(leafTask.id(), LocalDate.parse("2026-07-23"), new BigDecimal("1.25"), " memo ")
        );

        ArgumentCaptor<StudyLog> captor = ArgumentCaptor.forClass(StudyLog.class);
        verify(studyLogRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().account()).isEqualTo(account);
        assertThat(captor.getValue().project()).isEqualTo(project);
        assertThat(captor.getValue().wbsTask()).isEqualTo(leafTask);
        assertThat(captor.getValue().memo()).isEqualTo("memo");
        assertThat(response.summary().projectActualHours()).isEqualByComparingTo("1.25");
    }

    @Test
    void createRejectsFutureStudyDate() {
        when(projectRepository.findByIdAndAccount_Id(project.id(), accountId)).thenReturn(Optional.of(project));
        when(wbsTaskRepository.findByIdAndProject_Account_Id(leafTask.id(), accountId)).thenReturn(Optional.of(leafTask));

        assertThatThrownBy(() -> studyLogService.create(
                accountId,
                project.id(),
                new StudyLogCreateCommand(leafTask.id(), LocalDate.parse("2026-07-24"), new BigDecimal("1.00"), null)
        ))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("未来日の学習記録は登録できません。");
    }

    @Test
    void createRejectsInvalidStudyHours() {
        when(projectRepository.findByIdAndAccount_Id(project.id(), accountId)).thenReturn(Optional.of(project));
        when(wbsTaskRepository.findByIdAndProject_Account_Id(leafTask.id(), accountId)).thenReturn(Optional.of(leafTask));

        assertThatThrownBy(() -> studyLogService.create(
                accountId,
                project.id(),
                new StudyLogCreateCommand(leafTask.id(), LocalDate.parse("2026-07-23"), new BigDecimal("0.10"), null)
        ))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("学習時間は0.25時間以上9999.99時間以下、0.25時間単位で指定してください。");

        assertThatThrownBy(() -> studyLogService.create(
                accountId,
                project.id(),
                new StudyLogCreateCommand(leafTask.id(), LocalDate.parse("2026-07-23"), new BigDecimal("10000.00"), null)
        ))
                .isInstanceOf(InvalidRequestException.class);

        assertThatThrownBy(() -> studyLogService.create(
                accountId,
                project.id(),
                new StudyLogCreateCommand(leafTask.id(), LocalDate.parse("2026-07-23"), new BigDecimal("1.10"), null)
        ))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void createRejectsParentAndAnotherProjectLeaf() {
        WbsTask parentTask = WbsTask.createParent(project, "Parent", null, clock.instant());
        Project anotherProject = Project.create(
                account,
                "AWS",
                null,
                LocalDate.parse("2026-07-01"),
                LocalDate.parse("2026-08-31"),
                clock.instant()
        );
        WbsTask anotherProjectLeaf = WbsTask.createLeaf(
                anotherProject,
                null,
                "EC2",
                null,
                LocalDate.parse("2026-07-01"),
                LocalDate.parse("2026-07-31"),
                new BigDecimal("2.00"),
                clock.instant()
        );
        when(projectRepository.findByIdAndAccount_Id(project.id(), accountId)).thenReturn(Optional.of(project));
        when(wbsTaskRepository.findByIdAndProject_Account_Id(parentTask.id(), accountId)).thenReturn(Optional.of(parentTask));
        when(wbsTaskRepository.findByIdAndProject_Account_Id(anotherProjectLeaf.id(), accountId))
                .thenReturn(Optional.of(anotherProjectLeaf));

        assertThatThrownBy(() -> studyLogService.create(
                accountId,
                project.id(),
                new StudyLogCreateCommand(parentTask.id(), LocalDate.parse("2026-07-23"), new BigDecimal("1.00"), null)
        ))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("学習記録に指定できないタスクです。");

        assertThatThrownBy(() -> studyLogService.create(
                accountId,
                project.id(),
                new StudyLogCreateCommand(anotherProjectLeaf.id(), LocalDate.parse("2026-07-23"), new BigDecimal("1.00"), null)
        ))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("学習記録に指定できないタスクです。");
    }

    @Test
    void getRejectsStudyLogOwnedByAnotherAccountAsNotFound() {
        UUID studyLogId = UUID.randomUUID();
        when(studyLogRepository.findByIdAndAccount_Id(studyLogId, accountId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> studyLogService.get(accountId, studyLogId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("対象の学習記録が見つかりません。");
    }

    @Test
    void updateCanMoveToLeafInSameProjectAndReturnsBothTaskSummaries() {
        WbsTask nextTask = WbsTask.createLeaf(
                project,
                null,
                "JPA",
                null,
                LocalDate.parse("2026-08-01"),
                LocalDate.parse("2026-08-31"),
                new BigDecimal("3.00"),
                clock.instant()
        );
        StudyLog studyLog = StudyLog.record(
                account,
                project,
                leafTask,
                LocalDate.parse("2026-07-22"),
                new BigDecimal("1.00"),
                null,
                clock.instant()
        );
        when(studyLogRepository.findByIdAndAccount_Id(studyLog.id(), accountId)).thenReturn(Optional.of(studyLog));
        when(wbsTaskRepository.findByIdAndProject_Account_Id(nextTask.id(), accountId)).thenReturn(Optional.of(nextTask));
        when(studyLogQueryRepository.actualHoursForProject(project.id())).thenReturn(new BigDecimal("2.00"));
        when(studyLogQueryRepository.actualHoursForTask(nextTask.id())).thenReturn(new BigDecimal("1.25"));
        when(studyLogQueryRepository.actualHoursForTask(leafTask.id())).thenReturn(new BigDecimal("0.75"));

        StudyLogMutationResponse response = studyLogService.update(
                accountId,
                studyLog.id(),
                new StudyLogUpdateCommand(nextTask.id(), LocalDate.parse("2026-07-23"), new BigDecimal("1.25"), "updated")
        );

        assertThat(response.studyLog().wbsTaskId()).isEqualTo(nextTask.id());
        assertThat(response.summary().wbsTaskActualHours()).isEqualByComparingTo("1.25");
        assertThat(response.summary().previousWbsTaskId()).isEqualTo(leafTask.id());
        assertThat(response.summary().previousWbsTaskActualHours()).isEqualByComparingTo("0.75");
    }

    @Test
    void deleteReturnsSummaryAfterDeletion() {
        StudyLog studyLog = StudyLog.record(
                account,
                project,
                leafTask,
                LocalDate.parse("2026-07-22"),
                new BigDecimal("1.00"),
                null,
                clock.instant()
        );
        when(studyLogRepository.findByIdAndAccount_Id(studyLog.id(), accountId)).thenReturn(Optional.of(studyLog));
        when(studyLogQueryRepository.actualHoursForProject(project.id())).thenReturn(new BigDecimal("0.00"));
        when(studyLogQueryRepository.actualHoursForTask(leafTask.id())).thenReturn(new BigDecimal("0.00"));

        StudyLogDeleteResponse response = studyLogService.delete(accountId, studyLog.id());

        verify(studyLogRepository).delete(studyLog);
        verify(studyLogRepository).flush();
        assertThat(response.result()).isEqualTo("OK");
        assertThat(response.summary().projectActualHours()).isEqualByComparingTo("0.00");
        assertThat(response.summary().wbsTaskId()).isEqualTo(leafTask.id());
    }
}
