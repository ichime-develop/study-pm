package com.studypm.aiplan;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * OpenAIが提案する親タスクまたはLEAFタスクを表す。
 */
public record AiWbsDraftTask(
        String temporaryKey,
        AiDraftTaskType taskType,
        String parentTemporaryKey,
        String name,
        String description,
        LocalDate plannedStartDate,
        LocalDate plannedEndDate,
        BigDecimal plannedHours,
        List<String> sourceTemporaryKeys
) {
    public AiWbsDraftTask {
        sourceTemporaryKeys = sourceTemporaryKeys == null ? List.of() : List.copyOf(sourceTemporaryKeys);
    }
}
