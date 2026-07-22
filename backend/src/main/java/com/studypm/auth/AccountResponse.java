package com.studypm.auth;

import java.util.UUID;

import com.studypm.account.Account;

/**
 * 認証APIが返すアカウント概要を表す。
 */
public record AccountResponse(
        UUID accountId,
        String email,
        String displayName
) {
    public static AccountResponse from(Account account) {
        return new AccountResponse(account.id(), account.email(), account.displayName());
    }

    public static AccountResponse from(AuthenticatedAccount account) {
        return new AccountResponse(account.accountId(), account.email(), account.displayName());
    }
}
