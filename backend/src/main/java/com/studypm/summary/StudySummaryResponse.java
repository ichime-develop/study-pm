package com.studypm.summary;

import java.math.BigDecimal;

/**
 * プロジェクト一覧上部に表示するユーザー単位の学習サマリーを返す。
 */
public record StudySummaryResponse(
        int continuousStudyDays,
        BigDecimal totalStudyHours,
        long inProgressProjectCount
) {
}
