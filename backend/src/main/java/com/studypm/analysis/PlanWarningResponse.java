package com.studypm.analysis;

import java.time.LocalDate;
import java.util.UUID;

/**
 * WBSで修正すべき計画不整合タスクを返すAPI応答を表す。
 */
public record PlanWarningResponse(
        UUID taskId,
        String taskName,
        PlanWarningType type,
        LocalDate plannedStartDate,
        LocalDate plannedEndDate,
        String message
) {
}
