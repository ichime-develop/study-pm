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
    private final String visionApiKey;

    public AiFeatureAvailability(
            @Value("${app.ai.enabled:false}") boolean enabled,
            @Value("${app.ai.openai.api-key:}") String openAiApiKey,
            @Value("${app.ai.vision.api-key:}") String visionApiKey
    ) {
        this.enabled = enabled;
        this.openAiApiKey = openAiApiKey;
        this.visionApiKey = visionApiKey;
    }

    public void requireGenerationAvailable() {
        if (!enabled || openAiApiKey.isBlank()) {
            throw new ServiceUnavailableException("AI_FEATURE_UNAVAILABLE", "AI機能は現在利用できません。");
        }
    }

    public void requireOcrAvailable() {
        if (!enabled || visionApiKey.isBlank()) {
            throw new ServiceUnavailableException("AI_FEATURE_UNAVAILABLE", "画像の文字読み取りは現在利用できません。");
        }
    }

    @PostConstruct
    void validateEnabledConfiguration() {
        if (enabled && openAiApiKey.isBlank()) {
            throw new IllegalStateException("AI_ENABLED=true requires OPENAI_API_KEY.");
        }
        if (enabled && visionApiKey.isBlank()) {
            throw new IllegalStateException("AI_ENABLED=true requires GOOGLE_CLOUD_VISION_API_KEY.");
        }
    }
}
