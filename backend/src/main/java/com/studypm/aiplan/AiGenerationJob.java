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
    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;
    @Column(name = "schema_regeneration_count", nullable = false)
    private int schemaRegenerationCount;
    @Column(name = "error_code", length = 100)
    private String errorCode;
    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;
    @Column(name = "prompt_version", nullable = false, length = 50)
    private String promptVersion;
    @Column(name = "schema_version", nullable = false, length = 50)
    private String schemaVersion;
    @Column(name = "strategy_version", nullable = false, length = 50)
    private String strategyVersion;
    @Column(name = "started_at")
    private Instant startedAt;
    @Column(name = "completed_at")
    private Instant completedAt;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AiGenerationJob() {}

    private AiGenerationJob(AiPlanGenerationRequest request, Instant deadlineAt, String modelName, Instant now) {
        this.id = UUID.randomUUID();
        this.generationRequest = request;
        this.account = request.account();
        this.jobType = "WBS_GENERATION";
        this.status = AiGenerationJobStatus.QUEUED;
        this.deadlineAt = deadlineAt;
        this.modelName = modelName;
        this.promptVersion = "v1";
        this.schemaVersion = "v1";
        this.strategyVersion = "v1";
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static AiGenerationJob queue(AiPlanGenerationRequest request, Instant deadlineAt, String modelName, Instant now) {
        return new AiGenerationJob(request, deadlineAt, modelName, now);
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

    public void timeoutIfExpired(Instant now) {
        if (!deadlineAt.isAfter(now) || deadlineAt.equals(now)) {
            if (status == AiGenerationJobStatus.CANCEL_REQUESTED) {
                status = AiGenerationJobStatus.CANCELED;
            } else if (status == AiGenerationJobStatus.QUEUED || status == AiGenerationJobStatus.PROCESSING) {
                status = AiGenerationJobStatus.FAILED;
                errorCode = "AI_JOB_TIMEOUT";
            }
            if (status.isTerminal()) {
                completedAt = now;
                updatedAt = now;
            }
        }
    }

    public UUID id() { return id; }
    public AiGenerationJobStatus status() { return status; }
    public Instant createdAt() { return createdAt; }
    public Instant deadlineAt() { return deadlineAt; }
    public String errorCode() { return errorCode; }
}
