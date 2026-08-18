package com.studypm.aiplan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

/** AI専用の整数工数変換と値域を検証する。 */
class AiPlannedEffortConverterTest {

    @Test
    void convertsHundredthsToHoursWithoutFloatingPoint() {
        assertThat(AiPlannedEffortConverter.hundredthsToHours(25)).isEqualByComparingTo("0.25");
        assertThat(AiPlannedEffortConverter.hundredthsToHours(125)).isEqualByComparingTo("1.25");
        assertThat(AiPlannedEffortConverter.hundredthsToHours(999_975)).isEqualByComparingTo("9999.75");
    }

    @Test
    void rejectsMissingOutOfRangeAndNonQuarterHourValues() {
        for (Integer value : new Integer[]{null, -25, 24, 26, 999_999, 1_000_000}) {
            assertThatThrownBy(() -> AiPlannedEffortConverter.hundredthsToHours(value))
                    .isInstanceOf(AiStructuredOutputException.class)
                    .extracting(exception -> ((AiStructuredOutputException) exception).reasonCode())
                    .isEqualTo("OUTLINE_EFFORT_INVALID");
        }
    }
}
