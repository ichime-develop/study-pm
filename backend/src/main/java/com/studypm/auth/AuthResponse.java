package com.studypm.auth;

/**
 * 登録・ログイン成功時に返す認証結果を表す。
 */
public record AuthResponse(
        AccountResponse account,
        String accessToken
) {
}
