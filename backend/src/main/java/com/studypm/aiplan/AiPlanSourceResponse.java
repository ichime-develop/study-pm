package com.studypm.aiplan;

/**
 * 保存済みAI入力元の表示用情報を表す。
 */
public record AiPlanSourceResponse(
        String temporaryKey,
        AiPlanSourceType sourceType,
        int sourceOrder,
        String label,
        String textContent
) {
}
