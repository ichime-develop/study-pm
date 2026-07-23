package com.studypm.project;

import java.time.LocalDate;
import java.util.UUID;

/**
 * プロジェクト概要に表示する未完了LEAFタスクの要約を表す。
 */
public record ProjectOverviewTaskResponse(
        UUID wbsTaskId,
        String name,
        LocalDate plannedEndDate,
        int progressRate,
        boolean hasDelay
) {
    static ProjectOverviewTaskResponse from(ProjectOverviewTaskRow row) {
        return new ProjectOverviewTaskResponse(
                row.wbsTaskId(),
                row.name(),
                row.plannedEndDate(),
                row.progressRate(),
                row.hasDelay()
        );
    }
}
