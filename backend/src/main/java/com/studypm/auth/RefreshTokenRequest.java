package com.studypm.auth;

/**
 * Flutter等のCookieを使わないクライアントがrefresh tokenを送る入力を表す。
 */
public record RefreshTokenRequest(
        String refreshToken
) {
}
