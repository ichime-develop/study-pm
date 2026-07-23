package com.studypm.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * PC Web frontendからCookie付きAPI呼び出しを許可するCORS設定を保持する。
 */
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(
        List<String> allowedOrigins
) {
}
