package com.studypm.aiplan;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * AI生成前のユーザー入力と一時データの保持期限を表す。
 */
@Entity
@Table(name = "ai_plan_generation_requests")
public class AiPlanGenerationRequest {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private AiPlanRequestSourceType sourceType;

    @Column(name = "learning_goal", nullable = false, length = 5000)
    private String learningGoal;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "target_end_date", nullable = false)
    private LocalDate targetEndDate;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "constraints_json", nullable = false, columnDefinition = "jsonb")
    private JsonNode constraints;

    @Column(name = "retention_expires_at", nullable = false)
    private Instant retentionExpiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AiPlanGenerationRequest() {
    }

    private AiPlanGenerationRequest(Account account, AiPlanRequestCommand command, Instant retentionExpiresAt, Instant now) {
        this.id = UUID.randomUUID();
        this.account = account;
        apply(command, retentionExpiresAt, now);
        this.createdAt = now;
    }

    public static AiPlanGenerationRequest create(Account account, AiPlanRequestCommand command, Instant retentionExpiresAt, Instant now) {
        return new AiPlanGenerationRequest(account, command, retentionExpiresAt, now);
    }

    public void update(AiPlanRequestCommand command, Instant retentionExpiresAt, Instant now) {
        apply(command, retentionExpiresAt, now);
    }

    private void apply(AiPlanRequestCommand command, Instant retentionExpiresAt, Instant now) {
        this.sourceType = command.sourceType();
        this.learningGoal = command.learningGoal();
        this.startDate = command.startDate();
        this.targetEndDate = command.targetEndDate();
        this.constraints = command.constraints();
        this.retentionExpiresAt = retentionExpiresAt;
        this.updatedAt = now;
    }

    public UUID id() { return id; }
    public Account account() { return account; }
    public AiPlanRequestSourceType sourceType() { return sourceType; }
    public String learningGoal() { return learningGoal; }
    public LocalDate startDate() { return startDate; }
    public LocalDate targetEndDate() { return targetEndDate; }
    public JsonNode constraints() { return constraints; }
    public Instant updatedAt() { return updatedAt; }
}
