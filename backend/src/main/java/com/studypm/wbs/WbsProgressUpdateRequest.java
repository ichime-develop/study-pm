package com.studypm.wbs;

import jakarta.validation.constraints.NotNull;

/**
 * WBS進捗率更新APIのリクエスト本文を表す。
 */
public record WbsProgressUpdateRequest(
        @NotNull
        Integer progressRate
) {

    public WbsProgressUpdateCommand toCommand() {
        return new WbsProgressUpdateCommand(progressRate);
    }
}
