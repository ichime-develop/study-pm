package com.studypm.wbs;

/**
 * 進捗率更新結果と履歴追加有無を返す。
 */
public record WbsProgressUpdateResponse(
        WbsTaskResponse task,
        boolean historyAdded
) {
}
