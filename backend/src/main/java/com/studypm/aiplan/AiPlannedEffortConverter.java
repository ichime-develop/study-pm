package com.studypm.aiplan;

import java.math.BigDecimal;

/** OpenAIの整数工数を、下書きで使用する時間へ厳密に変換する。 */
final class AiPlannedEffortConverter {

    private static final int MINIMUM_HUNDREDTHS = 25;
    private static final int MAXIMUM_HUNDREDTHS = 999_999;
    private static final int STEP_HUNDREDTHS = 25;

    private AiPlannedEffortConverter() {
    }

    static BigDecimal hundredthsToHours(Integer hundredths) {
        if (hundredths == null
                || hundredths < MINIMUM_HUNDREDTHS
                || hundredths > MAXIMUM_HUNDREDTHS
                || hundredths % STEP_HUNDREDTHS != 0) {
            throw new AiStructuredOutputException(
                    "OUTLINE_EFFORT_INVALID",
                    "終端の学習項目には25以上999999以下、25単位のplannedEffortHundredthsを指定してください。"
            );
        }
        return BigDecimal.valueOf(hundredths, 2);
    }
}
