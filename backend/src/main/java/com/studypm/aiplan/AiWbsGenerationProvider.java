package com.studypm.aiplan;

/**
 * WBS下書きを生成する外部AIプロバイダ境界。
 */
public interface AiWbsGenerationProvider {
    AiWbsGenerationProviderResult generate(AiWbsGenerationWork work, String validationFeedback);
}
