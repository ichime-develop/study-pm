package com.studypm.wbs;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

/**
 * WBSタスクの現在値とタスク単位の集計値をAPIへ返す。
 */
public record WbsTaskResponse(
        UUID wbsTaskId,
        UUID projectId,
        UUID parentTaskId,
        WbsTaskType taskType,
        String name,
        String description,
        LocalDate plannedStartDate,
        LocalDate plannedEndDate,
        BigDecimal plannedHours,
        Integer progressRate,
        BigDecimal actualHours,
        boolean hasStudyLogs,
        Instant createdAt,
        Instant updatedAt
) {

    public static WbsTaskResponse from(WbsTask task, Map<UUID, WbsTaskMetrics> metricsByTaskId) {
        WbsTaskMetrics metrics = metricsByTaskId.getOrDefault(
                task.id(),
                new WbsTaskMetrics(BigDecimal.ZERO, false)
        );
        return new WbsTaskResponse(
                task.id(),
                task.project().id(),
                task.parentTaskId(),
                task.taskType(),
                task.name(),
                task.description(),
                task.plannedStartDate(),
                task.plannedEndDate(),
                task.plannedHours(),
                task.progressRate(),
                task.isLeaf() ? metrics.actualHours() : null,
                task.isLeaf() && metrics.hasStudyLogs(),
                task.createdAt(),
                task.updatedAt()
        );
    }
}
