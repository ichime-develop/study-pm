package com.studypm.wbs;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * WBSタスク基本・計画情報更新APIのService入力を表す。
 */
public record WbsTaskUpdateCommand(
        String name,
        String description,
        UUID parentTaskId,
        LocalDate plannedStartDate,
        LocalDate plannedEndDate,
        BigDecimal plannedHours
) {
}
