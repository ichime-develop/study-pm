package com.studypm.auth;

import java.util.UUID;

/**
 * SecurityContextに保持する認証済みアカウントの最小情報を表す。
 */
public record AuthenticatedAccount(
        UUID accountId,
        String email,
        String displayName
) {
}
