package com.studypm.auth;

import com.studypm.config.RefreshTokenCookieProperties;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * PC Web向けrefresh token Cookieの発行と削除を担当する。
 */
@Component
public class RefreshTokenCookieWriter {

    private final RefreshTokenCookieProperties properties;

    public RefreshTokenCookieWriter(RefreshTokenCookieProperties properties) {
        this.properties = properties;
    }

    public void write(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from(properties.name(), refreshToken)
                .path(properties.path())
                .httpOnly(properties.httpOnly())
                .secure(properties.secure())
                .sameSite(properties.sameSite())
                .maxAge(properties.maxAge())
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public void clear(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(properties.name(), "")
                .path(properties.path())
                .httpOnly(properties.httpOnly())
                .secure(properties.secure())
                .sameSite(properties.sameSite())
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
