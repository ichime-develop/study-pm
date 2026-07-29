package com.studypm.aiplan;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * 保存済みAI生成依頼を画面復帰用に返す。
 */
public record AiPlanRequestResponse(
        UUID generationRequestId,
        AiPlanRequestSourceType sourceType,
        String learningGoal,
        LocalDate startDate,
        LocalDate targetEndDate,
        JsonNode constraints,
        List<AiPlanSourceResponse> sources,
        AiPlanPrecheckResponse precheck
) {
}
