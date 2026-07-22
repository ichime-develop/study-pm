package com.studypm.auth;

/**
 * refresh token検証後に返す新しいaccess tokenを表す。
 */
public record AccessTokenResponse(
        String accessToken
) {
}
