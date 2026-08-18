package com.studypm.aiplan;

import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * AI生成依頼の保存APIで受け取る入力を表す。
 */
public record AiPlanRequestPayload(
        @NotNull AiPlanRequestSourceType sourceType,
        @NotBlank @Size(max = 5000) String learningGoal,
        @NotNull LocalDate startDate,
        @NotNull LocalDate targetEndDate,
        @NotNull JsonNode constraints,
        @NotNull @Size(min = 1) List<@Valid AiPlanSourcePayload> sources
) {
    public AiPlanRequestCommand toCommand() {
        return new AiPlanRequestCommand(
                sourceType,
                learningGoal.trim(),
                startDate,
                targetEndDate,
                constraints,
                sources.stream().map(AiPlanSourcePayload::toCommand).toList()
        );
    }
}
