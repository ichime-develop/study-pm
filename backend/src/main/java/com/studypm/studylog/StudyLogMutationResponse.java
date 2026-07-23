package com.studypm.studylog;

/**
 * 学習記録の作成・更新結果と再計算サマリーをまとめる。
 */
public record StudyLogMutationResponse(
        StudyLogResponse studyLog,
        StudyLogRecalculationResponse summary
) {
}
