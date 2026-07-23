package com.studypm.studylog;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Objects;
import java.util.UUID;

import com.studypm.account.Account;
import com.studypm.account.AccountRepository;
import com.studypm.common.api.PageResponse;
import com.studypm.common.error.InvalidRequestException;
import com.studypm.common.error.ResourceNotFoundException;
import com.studypm.project.Project;
import com.studypm.project.ProjectRepository;
import com.studypm.wbs.WbsTask;
import com.studypm.wbs.WbsTaskRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 学習記録CRUDの所有者検証、LEAF制約、未来日制約、再計算サマリーを進行する。
 */
@Service
public class StudyLogService {

    private static final ZoneId JST = ZoneId.of("Asia/Tokyo");
    private static final BigDecimal MIN_STUDY_HOURS = new BigDecimal("0.25");
    private static final BigDecimal MAX_STUDY_HOURS = new BigDecimal("9999.99");
    private static final BigDecimal QUARTER_HOUR_UNITS = new BigDecimal("4");

    private final StudyLogRepository studyLogRepository;
    private final StudyLogQueryRepository studyLogQueryRepository;
    private final ProjectRepository projectRepository;
    private final WbsTaskRepository wbsTaskRepository;
    private final AccountRepository accountRepository;
    private final Clock clock;

    public StudyLogService(
            StudyLogRepository studyLogRepository,
            StudyLogQueryRepository studyLogQueryRepository,
            ProjectRepository projectRepository,
            WbsTaskRepository wbsTaskRepository,
            AccountRepository accountRepository,
            Clock clock
    ) {
        this.studyLogRepository = studyLogRepository;
        this.studyLogQueryRepository = studyLogQueryRepository;
        this.projectRepository = projectRepository;
        this.wbsTaskRepository = wbsTaskRepository;
        this.accountRepository = accountRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public StudyLogListResponse list(UUID accountId, UUID projectId, UUID taskId, int page, int size) {
        findOwnedProject(accountId, projectId);
        WbsTask task = taskId == null ? null : validateStudyLogTask(accountId, projectId, taskId);
        PageRequest pageRequest = PageRequest.of(
                page,
                size,
                Sort.by(
                        Sort.Order.desc("studyDate"),
                        Sort.Order.desc("updatedAt"),
                        Sort.Order.asc("id")
                )
        );
        Page<StudyLog> studyLogs = task == null
                ? studyLogRepository.findAllByProject_IdAndAccount_Id(projectId, accountId, pageRequest)
                : studyLogRepository.findAllByProject_IdAndAccount_IdAndWbsTask_Id(
                        projectId,
                        accountId,
                        task.id(),
                        pageRequest
                );
        return new StudyLogListResponse(
                studyLogs.stream().map(StudyLogResponse::from).toList(),
                studyLogQueryRepository.totalStudyHours(projectId, task == null ? null : task.id()),
                new PageResponse(page, size, studyLogs.getTotalElements(), studyLogs.getTotalPages())
        );
    }

    @Transactional
    public StudyLogMutationResponse create(UUID accountId, UUID projectId, StudyLogCreateCommand command) {
        Project project = findOwnedProject(accountId, projectId);
        WbsTask task = validateStudyLogTask(accountId, projectId, command.wbsTaskId());
        validateStudyDate(command.studyDate());
        validateStudyHours(command.studyHours());
        Account account = accountRepository.getReferenceById(accountId);
        Instant now = clock.instant();
        StudyLog studyLog = StudyLog.record(
                account,
                project,
                task,
                command.studyDate(),
                command.studyHours(),
                normalizeMemo(command.memo()),
                now
        );
        StudyLog saved = studyLogRepository.saveAndFlush(studyLog);
        return new StudyLogMutationResponse(
                StudyLogResponse.from(saved),
                summaryFor(project.id(), task.id(), null)
        );
    }

    @Transactional(readOnly = true)
    public StudyLogResponse get(UUID accountId, UUID studyLogId) {
        return StudyLogResponse.from(findOwnedStudyLog(accountId, studyLogId));
    }

    @Transactional
    public StudyLogMutationResponse update(UUID accountId, UUID studyLogId, StudyLogUpdateCommand command) {
        StudyLog studyLog = findOwnedStudyLog(accountId, studyLogId);
        UUID projectId = studyLog.project().id();
        WbsTask nextTask = validateStudyLogTask(accountId, projectId, command.wbsTaskId());
        validateStudyDate(command.studyDate());
        validateStudyHours(command.studyHours());
        UUID previousTaskId = studyLog.wbsTask().id();
        boolean isTaskChanged = !Objects.equals(previousTaskId, nextTask.id());

        studyLog.update(
                nextTask,
                command.studyDate(),
                command.studyHours(),
                normalizeMemo(command.memo()),
                clock.instant()
        );
        studyLogRepository.flush();

        return new StudyLogMutationResponse(
                StudyLogResponse.from(studyLog),
                summaryFor(projectId, nextTask.id(), isTaskChanged ? previousTaskId : null)
        );
    }

    @Transactional
    public StudyLogDeleteResponse delete(UUID accountId, UUID studyLogId) {
        StudyLog studyLog = findOwnedStudyLog(accountId, studyLogId);
        UUID projectId = studyLog.project().id();
        UUID taskId = studyLog.wbsTask().id();
        studyLogRepository.delete(studyLog);
        studyLogRepository.flush();
        return StudyLogDeleteResponse.ok(summaryFor(projectId, taskId, null));
    }

    private Project findOwnedProject(UUID accountId, UUID projectId) {
        return projectRepository.findByIdAndAccount_Id(projectId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "PROJECT_NOT_FOUND",
                        "対象のプロジェクトが見つかりません。"
                ));
    }

    private StudyLog findOwnedStudyLog(UUID accountId, UUID studyLogId) {
        return studyLogRepository.findByIdAndAccount_Id(studyLogId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "STUDY_LOG_NOT_FOUND",
                        "対象の学習記録が見つかりません。"
                ));
    }

    private WbsTask validateStudyLogTask(UUID accountId, UUID projectId, UUID taskId) {
        WbsTask task = wbsTaskRepository.findByIdAndProject_Account_Id(taskId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "WBS_TASK_NOT_FOUND",
                        "対象のWBSタスクが見つかりません。"
                ));
        if (!Objects.equals(task.project().id(), projectId) || task.isParent()) {
            throw new InvalidRequestException("INVALID_STUDY_LOG_TASK", "学習記録に指定できないタスクです。");
        }
        return task;
    }

    private void validateStudyDate(LocalDate studyDate) {
        if (studyDate.isAfter(LocalDate.now(clock.withZone(JST)))) {
            throw new InvalidRequestException("INVALID_STUDY_DATE", "未来日の学習記録は登録できません。");
        }
    }

    private void validateStudyHours(BigDecimal studyHours) {
        if (studyHours.compareTo(MIN_STUDY_HOURS) < 0
                || studyHours.compareTo(MAX_STUDY_HOURS) > 0
                || studyHours.multiply(QUARTER_HOUR_UNITS).stripTrailingZeros().scale() > 0) {
            throw new InvalidRequestException("INVALID_STUDY_HOURS", "学習時間は0.25時間以上9999.99時間以下、0.25時間単位で指定してください。");
        }
    }

    private String normalizeMemo(String memo) {
        if (memo == null || memo.isBlank()) {
            return null;
        }
        String normalized = memo.trim();
        if (normalized.length() > 5000) {
            throw new InvalidRequestException("INVALID_STUDY_LOG_MEMO", "学習記録メモは5000文字以内で指定してください。");
        }
        return normalized;
    }

    private StudyLogRecalculationResponse summaryFor(UUID projectId, UUID taskId, UUID previousTaskId) {
        return new StudyLogRecalculationResponse(
                projectId,
                studyLogQueryRepository.actualHoursForProject(projectId),
                taskId,
                studyLogQueryRepository.actualHoursForTask(taskId),
                previousTaskId,
                previousTaskId == null ? null : studyLogQueryRepository.actualHoursForTask(previousTaskId)
        );
    }
}
