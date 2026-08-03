package com.studypm.aiplan;

/**
 * OpenAIへ送信する入力元を内部UUIDなしで表す。
 */
public record AiWbsGenerationSource(
        String temporaryKey,
        AiPlanSourceType sourceType,
        int sourceOrder,
        String label,
        String textContent
) {
}
