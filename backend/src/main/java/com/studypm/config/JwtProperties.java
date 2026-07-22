package com.studypm.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWTの有効期限設定を保持する。
 * トークン生成・検証の実処理は認証実装側で扱う。
 */
@ConfigurationProperties(prefix = "app.security.jwt")
public record JwtProperties(
        String secret,
        Duration accessTokenTtl,
        Duration refreshTokenTtl
) {

    public static final String DEVELOPMENT_SECRET = "study-pm-development-secret-key-please-change-in-production";
}
