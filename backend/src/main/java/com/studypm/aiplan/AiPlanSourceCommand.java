package com.studypm.aiplan;

/**
 * 生成依頼配下の入力元を表す正規化済みコマンド。
 */
public record AiPlanSourceCommand(
        String temporaryKey,
        AiPlanSourceType sourceType,
        int sourceOrder,
        String label,
        String textContent
) {
}
