package com.studypm.aiplan;

import java.time.Instant;
import java.util.UUID;

import com.studypm.account.Account;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * OpenAIによるWBS下書き生成の実行状態を表す。
 */
@Entity
@Table(name = "ai_generation_jobs")
public class AiGenerationJob {

    @Id
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ai_plan_generation_request_id", nullable = false)
    private AiPlanGenerationRequest generationRequest;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;
    @Column(name = "job_type", nullable = false, length = 30)
    private String jobType;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AiGenerationJobStatus status;
    @Column(name = "deadline_at", nullable = false)
    private Instant deadlineAt;
    @Column(name = "deadline_priority", nullable = false)
    private boolean deadlinePriority;
    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;
    @Column(name = "schema_regeneration_count", nullable = false)
    private int schemaRegenerationCount;
    @Column(name = "error_code", length = 100)
    private String errorCode;
    @Column(name = "provider_request_id", length = 255)
    private String providerRequestId;
    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;
    @Column(name = "prompt_version", nullable = false, length = 50)
    private String promptVersion;
    @Column(name = "schema_version", nullable = false, length = 50)
    private String schemaVersion;
    @Column(name = "strategy_version", nullable = false, length = 50)
    private String strategyVersion;
    @Column(name = "input_tokens")
    private Integer inputTokens;
    @Column(name = "output_tokens")
    private Integer outputTokens;
    @Column(name = "started_at")
    private Instant startedAt;
    @Column(name = "completed_at")
    private Instant completedAt;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AiGenerationJob() {}

    private AiGenerationJob(
            AiPlanGenerationRequest request,
            Instant deadlineAt,
            boolean deadlinePriority,
            String modelName,
            String promptVersion,
            String schemaVersion,
            String strategyVersion,
            Instant now
    ) {
        this.id = UUID.randomUUID();
        this.generationRequest = request;
        this.account = request.account();
        this.jobType = "WBS_GENERATION";
        this.status = AiGenerationJobStatus.QUEUED;
        this.deadlineAt = deadlineAt;
        this.deadlinePriority = deadlinePriority;
        this.modelName = modelName;
        this.promptVersion = promptVersion;
        this.schemaVersion = schemaVersion;
        this.strategyVersion = strategyVersion;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static AiGenerationJob queue(
            AiPlanGenerationRequest request,
            Instant deadlineAt,
            boolean deadlinePriority,
            String modelName,
            String promptVersion,
            String schemaVersion,
            String strategyVersion,
            Instant now
    ) {
        return new AiGenerationJob(
                request,
                deadlineAt,
                deadlinePriority,
                modelName,
                promptVersion,
                schemaVersion,
                strategyVersion,
                now
        );
    }

    public void requestCancel(Instant now) {
        if (status == AiGenerationJobStatus.QUEUED) {
            status = AiGenerationJobStatus.CANCELED;
            completedAt = now;
        } else if (status == AiGenerationJobStatus.PROCESSING) {
            status = AiGenerationJobStatus.CANCEL_REQUESTED;
        }
        updatedAt = now;
    }

    public void start(Instant now) {
        if (status != AiGenerationJobStatus.QUEUED) {
            return;
        }
        status = AiGenerationJobStatus.PROCESSING;
        startedAt = now;
        updatedAt = now;
    }

    public boolean recordAttempt(Instant now) {
        timeoutIfExpired(now);
        if (status == AiGenerationJobStatus.CANCEL_REQUESTED) {
            cancelAfterProcessing(now);
            return false;
        }
        if (status != AiGenerationJobStatus.PROCESSING) {
            return false;
        }
        attemptCount++;
        updatedAt = now;
        return true;
    }

    public boolean recordSchemaRegeneration(Instant now) {
        if (status != AiGenerationJobStatus.PROCESSING || schemaRegenerationCount >= 1) {
            return false;
        }
        schemaRegenerationCount++;
        updatedAt = now;
        return true;
    }

    public void complete(AiWbsGenerationProviderResult result, Instant now) {
        if (status != AiGenerationJobStatus.PROCESSING) {
            return;
        }
        status = AiGenerationJobStatus.COMPLETED;
        providerRequestId = result.providerRequestId();
        inputTokens = result.inputTokens();
        outputTokens = result.outputTokens();
        completedAt = now;
        updatedAt = now;
    }

    public void fail(String nextErrorCode, Instant now) {
        if (status.isTerminal()) {
            return;
        }
        if (status == AiGenerationJobStatus.CANCEL_REQUESTED) {
            cancelAfterProcessing(now);
            return;
        }
        status = AiGenerationJobStatus.FAILED;
        errorCode = nextErrorCode;
        completedAt = now;
        updatedAt = now;
    }

    public void cancelAfterProcessing(Instant now) {
        if (status != AiGenerationJobStatus.CANCEL_REQUESTED) {
            return;
        }
        status = AiGenerationJobStatus.CANCELED;
        completedAt = now;
        updatedAt = now;
    }

    public void timeoutIfExpired(Instant now) {
        if (status.isTerminal() || deadlineAt.isAfter(now)) {
            return;
        }
        if (status == AiGenerationJobStatus.CANCEL_REQUESTED) {
            status = AiGenerationJobStatus.CANCELED;
        } else if (status == AiGenerationJobStatus.QUEUED || status == AiGenerationJobStatus.PROCESSING) {
            status = AiGenerationJobStatus.FAILED;
            errorCode = "AI_JOB_TIMEOUT";
        }
        completedAt = now;
        updatedAt = now;
    }

    public UUID id() { return id; }
    public AiPlanGenerationRequest generationRequest() { return generationRequest; }
    public AiGenerationJobStatus status() { return status; }
    public String jobType() { return jobType; }
    public Instant createdAt() { return createdAt; }
    public Instant deadlineAt() { return deadlineAt; }
    public boolean isDeadlinePriority() { return deadlinePriority; }
    public String errorCode() { return errorCode; }
    public String modelName() { return modelName; }
    public String promptVersion() { return promptVersion; }
    public String schemaVersion() { return schemaVersion; }
    public String strategyVersion() { return strategyVersion; }
}
