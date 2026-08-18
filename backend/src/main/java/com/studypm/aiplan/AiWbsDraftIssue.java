package com.studypm.aiplan;

/** WBS下書きの保存を許可したまま利用者へ確認を促す警告を表す。 */
record AiWbsDraftIssue(
        String code,
        String message,
        String target
) {
}
