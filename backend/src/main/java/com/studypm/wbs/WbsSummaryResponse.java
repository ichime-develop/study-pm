package com.studypm.wbs;

import java.math.BigDecimal;
import java.util.UUID;

import com.studypm.project.ProjectAggregate;

/**
 * WBS画面でタスク一覧を再取得せずに更新する集計値を返す。
 */
public record WbsSummaryResponse(
        UUID projectId,
        BigDecimal plannedHours,
        BigDecimal actualHours,
        BigDecimal progressRate,
        boolean hasDelay
) {

    public static WbsSummaryResponse from(UUID projectId, ProjectAggregate aggregate) {
        return new WbsSummaryResponse(
                projectId,
                aggregate.plannedHours(),
                aggregate.actualHours(),
                aggregate.progressRate(),
                aggregate.hasDelay()
        );
    }
}
