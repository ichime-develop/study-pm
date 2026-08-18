package com.studypm.aiplan;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * 構造・業務制約・計画整合性を検証済みのWBS下書きを表す。
 */
public record AiValidatedWbsDraft(
        AiWbsDraftProposal proposal,
        JsonNode tasksJson,
        AiPlanDraftValidationStatus validationStatus,
        JsonNode warnings,
        JsonNode relaxationOptions,
        Map<LocalDate, BigDecimal> dailyPlannedHours
) {
    public AiValidatedWbsDraft {
        dailyPlannedHours = Map.copyOf(dailyPlannedHours);
    }
}
