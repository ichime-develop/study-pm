package com.studypm.aiplan;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import com.studypm.common.error.BusinessConflictException;
import com.studypm.common.error.ResourceNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * WBS生成ジョブの受付、ポーリング、停止要求を管理する。
 */
@Service
public class AiGenerationJobService {

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
    public AiGenerationJobResponse create(UUID accountId, UUID requestId) {
        AiPlanGenerationRequest request = requestRepository.findByIdAndAccount_Id(requestId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("AI_PLAN_NOT_FOUND", "対象のAI計画は見つかりません。"));
        Instant now = clock.instant();
        Instant startOfJstDay = now.atZone(ZoneOffset.UTC).withZoneSameInstant(java.time.ZoneId.of("Asia/Tokyo"))
                .toLocalDate().atStartOfDay(java.time.ZoneId.of("Asia/Tokyo")).toInstant();
        if (jobRepository.countByAccount_IdAndCreatedAtGreaterThanEqual(accountId, startOfJstDay) >= dailyLimit) {
            throw new BusinessConflictException("AI_DAILY_LIMIT_REACHED", "本日のWBS下書き生成上限に達しました。");
        }
        try {
            AiGenerationJob job = jobRepository.save(AiGenerationJob.queue(request, now.plus(timeout), modelName, now));
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

    private AiGenerationJobResponse responseFor(AiGenerationJob job) {
        AiGenerationJobError error = job.errorCode() == null ? null
                : new AiGenerationJobError(job.errorCode(), "WBS下書きの生成を完了できませんでした。");
        return new AiGenerationJobResponse(job.id(), "WBS_GENERATION", job.status(), job.createdAt(), job.deadlineAt(), error, null);
    }
}
