package com.studypm.aiplan;

import java.time.LocalDate;

/**
 * AI03へ返すプロジェクト基本情報を表す。
 */
public record AiPlanDraftProjectResponse(
        String name,
        String description,
        LocalDate startDate,
        LocalDate targetEndDate
) {
}
