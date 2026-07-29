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
        AiFeatureAvailability availability = new AiFeatureAvailability(false, "test-api-key");

        assertThatThrownBy(availability::requireAvailable)
                .isInstanceOfSatisfying(ServiceUnavailableException.class, exception ->
                        org.assertj.core.api.Assertions.assertThat(exception.code()).isEqualTo("AI_FEATURE_UNAVAILABLE")
                );
    }

    @Test
    void enabledFeatureWithoutApiKeyIsUnavailable() {
        AiFeatureAvailability availability = new AiFeatureAvailability(true, " ");

        assertThatThrownBy(availability::requireAvailable)
                .isInstanceOf(ServiceUnavailableException.class);
    }
}
