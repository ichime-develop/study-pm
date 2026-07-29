package com.studypm.aiplan;

import com.studypm.common.error.ServiceUnavailableException;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * AI APIを公開できる設定かを、外部サービス呼び出し前に判定する。
 */
@Component
public class AiFeatureAvailability {

    private final boolean enabled;
    private final String openAiApiKey;

    public AiFeatureAvailability(
            @Value("${app.ai.enabled:false}") boolean enabled,
            @Value("${app.ai.openai.api-key:}") String openAiApiKey
    ) {
        this.enabled = enabled;
        this.openAiApiKey = openAiApiKey;
    }

    public void requireAvailable() {
        if (!enabled || openAiApiKey.isBlank()) {
            throw new ServiceUnavailableException("AI_FEATURE_UNAVAILABLE", "AI機能は現在利用できません。");
        }
    }

    @PostConstruct
    void validateEnabledConfiguration() {
        if (enabled && openAiApiKey.isBlank()) {
            throw new IllegalStateException("AI_ENABLED=true requires OPENAI_API_KEY.");
        }
    }
}
