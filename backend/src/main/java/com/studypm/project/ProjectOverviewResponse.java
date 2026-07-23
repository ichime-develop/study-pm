package com.studypm.project;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * プロジェクト概要画面の主要指標、警告、未完了タスクをまとめて返す。
 */
public record ProjectOverviewResponse(
        UUID projectId,
        BigDecimal progressRate,
        BigDecimal plannedHours,
        BigDecimal remainingPlannedHours,
        BigDecimal projectStudyHours,
        int projectContinuousStudyDays,
        List<ProjectWarningResponse> warnings,
        List<ProjectOverviewTaskResponse> incompleteTasks
) {
}
