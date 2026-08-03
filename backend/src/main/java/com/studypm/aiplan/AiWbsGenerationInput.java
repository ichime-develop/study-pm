package com.studypm.aiplan;

import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * 保存済み生成依頼から構築したOpenAI送信用入力を表す。
 */
public record AiWbsGenerationInput(
        AiPlanRequestSourceType sourceType,
        String learningGoal,
        LocalDate startDate,
        LocalDate targetEndDate,
        JsonNode constraints,
        Integer requiredDays,
        List<AiWbsGenerationSource> sources
) {
    public AiWbsGenerationInput {
        sources = List.copyOf(sources);
    }
}
