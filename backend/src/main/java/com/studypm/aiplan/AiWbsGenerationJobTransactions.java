package com.studypm.aiplan;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 外部API呼び出しを挟むWBS生成ジョブの短いDBトランザクションを提供する。
 * ジョブ獲得は悲観ロックを使い、同じQUEUEDジョブの同時処理を防止する。
 */
@Service
public class AiWbsGenerationJobTransactions {

    private final AiGenerationJobRepository jobRepository;
    private final AiPlanSourceRepository sourceRepository;
    private final AiPlanDraftRepository draftRepository;
    private final Clock clock;

    public AiWbsGenerationJobTransactions(
            AiGenerationJobRepository jobRepository,
            AiPlanSourceRepository sourceRepository,
            AiPlanDraftRepository draftRepository,
            Clock clock
    ) {
        this.jobRepository = jobRepository;
        this.sourceRepository = sourceRepository;
        this.draftRepository = draftRepository;
        this.clock = clock;
    }

    @Transactional
    public Optional<AiWbsGenerationWork> claimNext() {
        Optional<AiGenerationJob> queuedJob = jobRepository.findFirstByStatusOrderByCreatedAtAsc(AiGenerationJobStatus.QUEUED);
        if (queuedJob.isEmpty()) {
            return Optional.empty();
        }
        AiGenerationJob job = queuedJob.get();
        Instant now = clock.instant();
        job.timeoutIfExpired(now);
        if (job.status() != AiGenerationJobStatus.QUEUED) {
            return Optional.empty();
        }
        job.start(now);
        AiPlanGenerationRequest request = job.generationRequest();
        List<AiWbsGenerationSource> sources = sourceRepository
                .findAllByGenerationRequest_IdOrderBySourceOrderAsc(request.id())
                .stream()
                .map(source -> new AiWbsGenerationSource(
                        source.temporaryKey(),
                        source.sourceType(),
                        source.sourceOrder(),
                        source.label(),
                        source.textContent()
                ))
                .toList();
        AiWbsGenerationInput input = new AiWbsGenerationInput(
                request.sourceType(),
                request.learningGoal(),
                request.startDate(),
                request.targetEndDate(),
                request.constraints(),
                requiredDays(request.constraints()),
                sources
        );
        return Optional.of(new AiWbsGenerationWork(
                job.id(),
                job.modelName(),
                job.promptVersion(),
                job.schemaVersion(),
                job.strategyVersion(),
                job.deadlineAt(),
                job.isDeadlinePriority(),
                input
        ));
    }

    @Transactional
    public boolean recordAttempt(UUID jobId) {
        return findForUpdate(jobId).recordAttempt(clock.instant());
    }

    @Transactional
    public boolean recordSchemaRegeneration(UUID jobId) {
        return findForUpdate(jobId).recordSchemaRegeneration(clock.instant());
    }

    @Transactional
    public void complete(
            UUID jobId,
            AiWbsGenerationProviderResult providerResult,
            AiValidatedWbsDraft validatedDraft
    ) {
        AiGenerationJob job = findForUpdate(jobId);
        Instant now = clock.instant();
        job.timeoutIfExpired(now);
        if (job.status() == AiGenerationJobStatus.CANCEL_REQUESTED) {
            job.cancelAfterProcessing(now);
            return;
        }
        if (job.status() != AiGenerationJobStatus.PROCESSING) {
            return;
        }
        draftRepository.save(AiPlanDraft.create(job, validatedDraft, now));
        job.complete(providerResult, now);
    }

    @Transactional
    public void fail(UUID jobId, String errorCode) {
        AiGenerationJob job = findForUpdate(jobId);
        job.timeoutIfExpired(clock.instant());
        job.fail(errorCode, clock.instant());
    }

    private AiGenerationJob findForUpdate(UUID jobId) {
        return jobRepository.findByIdForUpdate(jobId)
                .orElseThrow(() -> new IllegalStateException("AI generation job disappeared during processing."));
    }

    private Integer requiredDays(com.fasterxml.jackson.databind.JsonNode constraints) {
        return AiQuantityCondition.from(constraints)
                .map(AiQuantityCondition::requiredDays)
                .orElse(null);
    }
}
