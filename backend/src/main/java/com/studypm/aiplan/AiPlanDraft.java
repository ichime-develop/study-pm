package com.studypm.aiplan;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
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

/** AI出力を通常WBSへ変換する前に保持する編集可能な下書き。 */
@Entity
@Table(name = "ai_plan_drafts")
public class AiPlanDraft {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "ai_plan_generation_request_id", nullable = false)
    private AiPlanGenerationRequest generationRequest;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "ai_generation_job_id", nullable = false)
    private AiGenerationJob generationJob;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "account_id", nullable = false)
    private Account account;
    @Column(nullable = false) private int revision;
    @Column(name = "project_name", nullable = false, length = 100) private String projectName;
    @Column(name = "project_description", length = 5000) private String projectDescription;
    @Column(name = "start_date", nullable = false) private LocalDate startDate;
    @Column(name = "target_end_date", nullable = false) private LocalDate targetEndDate;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "draft_wbs_tasks_json", nullable = false, columnDefinition = "jsonb") private JsonNode tasks;
    @Enumerated(EnumType.STRING) @Column(name = "validation_status", nullable = false, length = 20) private AiPlanDraftValidationStatus validationStatus;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "warnings_json", nullable = false, columnDefinition = "jsonb") private JsonNode warnings;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "relaxation_options_json", nullable = false, columnDefinition = "jsonb") private JsonNode relaxationOptions;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "daily_planned_hours_json", columnDefinition = "jsonb") private JsonNode dailyPlannedHours;
    @Column(name = "converted_project_id") private UUID convertedProjectId;
    @Column(name = "converted_at") private Instant convertedAt;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    protected AiPlanDraft() {}

    private AiPlanDraft(
            AiGenerationJob generationJob,
            AiValidatedWbsDraft validatedDraft,
            Instant now
    ) {
        this.id = UUID.randomUUID();
        this.generationRequest = generationJob.generationRequest();
        this.generationJob = generationJob;
        this.account = generationJob.generationRequest().account();
        this.revision = 1;
        this.projectName = validatedDraft.proposal().project().name();
        this.projectDescription = emptyToNull(validatedDraft.proposal().project().description());
        this.startDate = validatedDraft.proposal().project().startDate();
        this.targetEndDate = validatedDraft.proposal().project().targetEndDate();
        this.tasks = validatedDraft.tasksJson();
        this.validationStatus = validatedDraft.validationStatus();
        this.warnings = validatedDraft.warnings();
        this.relaxationOptions = validatedDraft.relaxationOptions();
        this.dailyPlannedHours = dailyPlannedHoursJson(validatedDraft.dailyPlannedHours());
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static AiPlanDraft create(
            AiGenerationJob generationJob,
            AiValidatedWbsDraft validatedDraft,
            Instant now
    ) {
        return new AiPlanDraft(generationJob, validatedDraft, now);
    }

    public UUID id() { return id; }
    public int revision() { return revision; }
    public String projectName() { return projectName; }
    public String projectDescription() { return projectDescription; }
    public LocalDate startDate() { return startDate; }
    public LocalDate targetEndDate() { return targetEndDate; }
    public JsonNode tasks() { return tasks; }
    public AiPlanDraftValidationStatus validationStatus() { return validationStatus; }
    public JsonNode warnings() { return warnings; }
    public JsonNode relaxationOptions() { return relaxationOptions; }
    public JsonNode dailyPlannedHours() { return dailyPlannedHours; }
    public AiPlanGenerationRequest generationRequest() { return generationRequest; }
    public Instant createdAt() { return createdAt; }
    public boolean isConverted() { return convertedAt != null; }

    public void update(AiValidatedWbsDraft validatedDraft, Instant now) {
        this.revision++;
        this.projectName = validatedDraft.proposal().project().name();
        this.projectDescription = emptyToNull(validatedDraft.proposal().project().description());
        this.startDate = validatedDraft.proposal().project().startDate();
        this.targetEndDate = validatedDraft.proposal().project().targetEndDate();
        this.tasks = validatedDraft.tasksJson();
        this.validationStatus = validatedDraft.validationStatus();
        this.warnings = validatedDraft.warnings();
        this.relaxationOptions = validatedDraft.relaxationOptions();
        this.dailyPlannedHours = dailyPlannedHoursJson(validatedDraft.dailyPlannedHours());
        this.updatedAt = now;
    }

    public void markConverted(UUID projectId, Instant now) {
        this.convertedProjectId = projectId;
        this.convertedAt = now;
        this.updatedAt = now;
    }

    private static String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static JsonNode dailyPlannedHoursJson(Map<LocalDate, BigDecimal> dailyPlannedHours) {
        ObjectNode result = JsonNodeFactory.instance.objectNode();
        dailyPlannedHours.forEach((date, hours) -> result.put(date.toString(), hours));
        return result;
    }
}
