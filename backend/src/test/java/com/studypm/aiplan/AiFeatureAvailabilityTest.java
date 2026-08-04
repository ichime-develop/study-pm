package com.studypm.aiplan;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.studypm.common.error.ServiceUnavailableException;
import org.junit.jupiter.api.Test;

/**
 * AI機能の設定不足を外部サービス呼び出し前に拒否することを検証する。
 */
class AiFeatureAvailabilityTest {

    @Test
    void disabledFeatureIsUnavailableEvenWhenApiKeyExists() {
        AiFeatureAvailability availability = new AiFeatureAvailability(false, "test-openai-key", "test-vision-key");

        assertThatThrownBy(availability::requireGenerationAvailable)
                .isInstanceOfSatisfying(ServiceUnavailableException.class, exception ->
                        org.assertj.core.api.Assertions.assertThat(exception.code()).isEqualTo("AI_FEATURE_UNAVAILABLE")
                );
    }

    @Test
    void enabledFeatureWithoutApiKeyIsUnavailable() {
        AiFeatureAvailability availability = new AiFeatureAvailability(true, " ", "test-vision-key");

        assertThatThrownBy(availability::requireGenerationAvailable)
                .isInstanceOf(ServiceUnavailableException.class);
    }

    @Test
    void enabledOcrWithoutVisionApiKeyIsUnavailable() {
        AiFeatureAvailability availability = new AiFeatureAvailability(true, "test-openai-key", " ");

        assertThatThrownBy(availability::requireOcrAvailable)
                .isInstanceOf(ServiceUnavailableException.class);
    }

    @Test
    void enabledFeatureRequiresBothProviderKeysAtStartup() {
        AiFeatureAvailability missingOpenAi = new AiFeatureAvailability(true, " ", "test-vision-key");
        AiFeatureAvailability missingVision = new AiFeatureAvailability(true, "test-openai-key", " ");

        assertThatThrownBy(missingOpenAi::validateEnabledConfiguration)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("OPENAI_API_KEY");
        assertThatThrownBy(missingVision::validateEnabledConfiguration)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("GOOGLE_CLOUD_VISION_API_KEY");
    }
}
