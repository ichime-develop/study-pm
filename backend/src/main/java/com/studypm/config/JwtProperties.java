package com.studypm.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.security.jwt")
public record JwtProperties(
        Duration accessTokenTtl,
        Duration refreshTokenTtl
) {
}
