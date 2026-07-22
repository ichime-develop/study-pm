package com.studypm.auth;

import com.studypm.account.Account;

/**
 * 認証成功後に発行されたトークンと対象アカウントをまとめる。
 */
public record AuthSession(
        Account account,
        String accessToken,
        String refreshToken
) {
}
