package com.studypm.aiplan;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * AI生成依頼へ含める1件の入力元を表す。
 */
public record AiPlanSourcePayload(
        @NotBlank @Size(max = 100) String temporaryKey,
        @NotNull AiPlanSourceType sourceType,
        @Max(1000) int sourceOrder,
        @Size(max = 100) String label,
        @NotBlank String textContent
) {
    public AiPlanSourceCommand toCommand() {
        return new AiPlanSourceCommand(
                temporaryKey.trim(),
                sourceType,
                sourceOrder,
                label == null || label.isBlank() ? null : label.trim(),
                textContent.trim()
        );
    }
}
