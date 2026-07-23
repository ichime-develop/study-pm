package com.studypm.studylog;

import java.math.BigDecimal;
import java.util.List;

import com.studypm.common.api.PageResponse;

/**
 * プロジェクト内学習記録一覧と合計学習時間を表す。
 */
public record StudyLogListResponse(
        List<StudyLogResponse> studyLogs,
        BigDecimal totalStudyHours,
        PageResponse page
) {
}
