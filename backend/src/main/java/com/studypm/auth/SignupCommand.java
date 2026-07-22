package com.studypm.auth;

/**
 * アカウント登録ユースケースへ渡す入力値を表す。
 */
public record SignupCommand(
        String email,
        String password,
        String displayName
) {
}
