package com.studypm.aiplan;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import com.studypm.common.error.BusinessConflictException;
import com.studypm.common.error.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * WBS生成ジョブの受付、ポーリング、停止要求を管理する。
 */
@Service
public class AiGenerationJobService {

    private static final ZoneId JST = ZoneId.of("Asia/Tokyo");
    private static final List<AiGenerationJobStatus> ACTIVE_STATUSES = List.of(
            AiGenerationJobStatus.QUEUED,
            AiGenerationJobStatus.PROCESSING,
            AiGenerationJobStatus.CANCEL_REQUESTED
    );

    private final AiPlanGenerationRequestRepository requestRepository;
    private final AiGenerationJobRepository jobRepository;
    private final Clock clock;
    private final java.time.Duration timeout;
    private final int dailyLimit;
    private final String modelName;

    public AiGenerationJobService(
            AiPlanGenerationRequestRepository requestRepository,
            AiGenerationJobRepository jobRepository,
            Clock clock,
            @Value("${app.ai.job-timeout:5m}") java.time.Duration timeout,
            @Value("${app.ai.daily-generation-limit:10}") int dailyLimit,
            @Value("${app.ai.openai.model:gpt-4.1-mini}") String modelName
    ) {
        this.requestRepository = requestRepository;
        this.jobRepository = jobRepository;
        this.clock = clock;
        this.timeout = timeout;
        this.dailyLimit = dailyLimit;
        this.modelName = modelName;
    }

    @Transactional
    public AiGenerationJobResponse create(UUID accountId, UUID requestId, boolean deadlinePriority) {
        AiPlanGenerationRequest request = requestRepository.findByIdAndAccount_Id(requestId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("AI_PLAN_NOT_FOUND", "対象のAI計画は見つかりません。"));
        Instant now = clock.instant();
        timeoutExpiredJobs(accountId, now);
        // HibernateはINSERTをUPDATEより先に実行するため、activeジョブの一意制約に触れる前に期限切れ解消をDBへ反映する。
        jobRepository.flush();
        Instant startOfJstDay = now.atZone(JST).toLocalDate().atStartOfDay(JST).toInstant();
        if (jobRepository.countByAccount_IdAndCreatedAtGreaterThanEqual(accountId, startOfJstDay) >= dailyLimit) {
            throw new BusinessConflictException("AI_DAILY_LIMIT_REACHED", "本日のWBS下書き生成上限に達しました。");
        }
        try {
            AiGenerationJob job = jobRepository.saveAndFlush(
                    AiGenerationJob.queue(request, now.plus(timeout), deadlinePriority, modelName, now)
            );
            return responseFor(job);
        } catch (org.springframework.dao.DataIntegrityViolationException exception) {
            throw new BusinessConflictException("AI_JOB_ALREADY_ACTIVE", "進行中のWBS下書き生成があります。");
        }
    }

    @Transactional
    public AiGenerationJobResponse get(UUID accountId, UUID jobId) {
        AiGenerationJob job = findOwned(accountId, jobId);
        job.timeoutIfExpired(clock.instant());
        return responseFor(job);
    }

    @Transactional
    public AiGenerationJobResponse cancel(UUID accountId, UUID jobId) {
        AiGenerationJob job = findOwned(accountId, jobId);
        job.timeoutIfExpired(clock.instant());
        job.requestCancel(clock.instant());
        return responseFor(job);
    }

    private AiGenerationJob findOwned(UUID accountId, UUID jobId) {
        return jobRepository.findByIdAndAccount_Id(jobId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("AI_PLAN_NOT_FOUND", "対象のAI計画は見つかりません。"));
    }

    private void timeoutExpiredJobs(UUID accountId, Instant now) {
        jobRepository.findAllByAccount_IdAndStatusIn(accountId, ACTIVE_STATUSES)
                .forEach(job -> job.timeoutIfExpired(now));
    }

    private AiGenerationJobResponse responseFor(AiGenerationJob job) {
        AiGenerationJobError error = job.errorCode() == null ? null
                : new AiGenerationJobError(job.errorCode(), "WBS下書きの生成を完了できませんでした。");
        return new AiGenerationJobResponse(job.id(), job.jobType(), job.status(), job.createdAt(), job.deadlineAt(), error, null);
    }
}
