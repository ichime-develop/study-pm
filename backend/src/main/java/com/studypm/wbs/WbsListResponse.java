package com.studypm.wbs;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * WBS画面に必要なタスク一覧、ガント範囲、基礎集計値を返す。
 */
public record WbsListResponse(
        UUID projectId,
        LocalDate ganttStartDate,
        LocalDate ganttEndDate,
        BigDecimal plannedHours,
        BigDecimal actualHours,
        BigDecimal progressRate,
        boolean hasDelay,
        List<WbsTaskResponse> tasks
) {

    public static WbsListResponse from(
            WbsSummaryResponse summary,
            LocalDate ganttStartDate,
            LocalDate ganttEndDate,
            List<WbsTaskResponse> tasks
    ) {
        return new WbsListResponse(
                summary.projectId(),
                ganttStartDate,
                ganttEndDate,
                summary.plannedHours(),
                summary.actualHours(),
                summary.progressRate(),
                summary.hasDelay(),
                tasks
        );
    }
}
