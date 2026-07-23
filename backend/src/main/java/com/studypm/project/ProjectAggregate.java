package com.studypm.project;

import java.math.BigDecimal;

/**
 * プロジェクト一覧で使うWBSと学習記録由来の集計値を表す。
 */
public record ProjectAggregate(
        long leafCount,
        BigDecimal plannedHours,
        BigDecimal actualHours,
        BigDecimal progressRate,
        boolean hasDelay
) {
}
