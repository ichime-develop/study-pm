package com.studypm.wbs;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * WBSタスク作成APIのService入力を表す。
 */
public record WbsTaskCreateCommand(
        String taskType,
        String name,
        String description,
        UUID parentTaskId,
        LocalDate plannedStartDate,
        LocalDate plannedEndDate,
        BigDecimal plannedHours
) {
}
