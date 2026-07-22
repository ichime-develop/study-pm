package com.studypm.auth;

/**
 * 副作用のみの認証APIが返す成功結果を表す。
 */
public record SuccessResponse(
        String result
) {
    public static SuccessResponse ok() {
        return new SuccessResponse("OK");
    }
}
