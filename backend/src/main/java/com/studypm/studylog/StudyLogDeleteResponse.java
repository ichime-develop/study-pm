package com.studypm.studylog;

/**
 * 学習記録削除結果と再計算サマリーをまとめる。
 */
public record StudyLogDeleteResponse(
        String result,
        StudyLogRecalculationResponse summary
) {
    public static StudyLogDeleteResponse ok(StudyLogRecalculationResponse summary) {
        return new StudyLogDeleteResponse("OK", summary);
    }
}
