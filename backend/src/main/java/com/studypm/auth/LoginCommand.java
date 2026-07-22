package com.studypm.auth;

/**
 * ログインユースケースへ渡す入力値を表す。
 */
public record LoginCommand(
        String email,
        String password
) {
}
