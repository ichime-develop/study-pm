package com.studypm.wbs;

import java.math.BigDecimal;

/**
 * WBSタスク単位の学習記録集計値を表す。
 */
public record WbsTaskMetrics(
        BigDecimal actualHours,
        boolean hasStudyLogs
) {
}
