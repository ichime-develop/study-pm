package com.studypm.wbs;

/**
 * WBS進捗率更新APIのService入力を表す。
 */
public record WbsProgressUpdateCommand(
        Integer progressRate
) {
}
