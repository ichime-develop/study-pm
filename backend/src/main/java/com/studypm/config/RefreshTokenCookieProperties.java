package com.studypm.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * PC Web向けrefresh token Cookieの属性を保持する。
 * Flutter向けのトークン受け渡し方式はこの設定では扱わない。
 */
@ConfigurationProperties(prefix = "app.security.refresh-cookie")
public record RefreshTokenCookieProperties(
        String name,
        String path,
        boolean httpOnly,
        boolean secure,
        String sameSite,
        Duration maxAge
) {
}
