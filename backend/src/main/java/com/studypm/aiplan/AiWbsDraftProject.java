package com.studypm.aiplan;

import java.time.LocalDate;

/**
 * OpenAIが提案するプロジェクト基本情報を表す。
 */
public record AiWbsDraftProject(
        String name,
        String description,
        LocalDate startDate,
        LocalDate targetEndDate
) {
}
