package com.studypm.aiplan;

/**
 * 外部AIの構造化出力と監査用メタデータを表す。
 */
public record AiWbsGenerationProviderResult(
        AiWbsGenerationProposal proposal,
        String providerRequestId,
        Integer inputTokens,
        Integer outputTokens
) {
}
