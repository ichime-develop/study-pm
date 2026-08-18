package com.studypm.aiplan;

import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * AI03へ返す編集前のWBS下書きと計画警告を表す。
 */
public record AiPlanDraftResponse(
        UUID draftId,
        int draftRevision,
        AiPlanDraftProjectResponse project,
        JsonNode tasks,
        AiPlanDraftValidationResponse validation,
        JsonNode planWarnings,
        JsonNode relaxationOptions
) {
}
