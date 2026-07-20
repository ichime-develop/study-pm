package com.studypm.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

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
