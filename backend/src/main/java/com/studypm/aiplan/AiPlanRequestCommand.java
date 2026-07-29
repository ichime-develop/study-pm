package com.studypm.aiplan;

import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * AI生成依頼を作成・更新するための正規化済み入力を表す。
 */
public record AiPlanRequestCommand(
        AiPlanRequestSourceType sourceType,
        String learningGoal,
        LocalDate startDate,
        LocalDate targetEndDate,
        JsonNode constraints,
        List<AiPlanSourceCommand> sources
) {
}
