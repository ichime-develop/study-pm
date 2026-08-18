package com.studypm.aiplan;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** OpenAI提案を2階層化し、予定日を割り当てた結果を表す。 */
record AiWbsDraftAssembly(
        AiWbsDraftProposal proposal,
        List<AiWbsDraftIssue> warnings,
        Map<LocalDate, BigDecimal> dailyPlannedHours
) {
    AiWbsDraftAssembly {
        warnings = List.copyOf(warnings);
        dailyPlannedHours = Map.copyOf(dailyPlannedHours);
    }
}
