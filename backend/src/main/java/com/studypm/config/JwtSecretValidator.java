package com.studypm.config;

import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

/**
 * JWT署名鍵が実行環境に対して安全な設定になっているか起動時に検証する。
 */
@Component
public class JwtSecretValidator implements InitializingBean {

    private static final int MINIMUM_HMAC_SECRET_BYTES = 32;

    private final JwtProperties jwtProperties;
    private final Environment environment;

    public JwtSecretValidator(JwtProperties jwtProperties, Environment environment) {
        this.jwtProperties = jwtProperties;
        this.environment = environment;
    }

    @Override
    public void afterPropertiesSet() {
        if (jwtProperties.secret() == null || jwtProperties.secret().isBlank()) {
            throw new IllegalStateException("JWT secret must be configured.");
        }
        if (jwtProperties.secret().getBytes(StandardCharsets.UTF_8).length < MINIMUM_HMAC_SECRET_BYTES) {
            throw new IllegalStateException("JWT secret must be at least 32 bytes for HS256.");
        }
        if (environment.acceptsProfiles(Profiles.of("prod", "production"))
                && JwtProperties.DEVELOPMENT_SECRET.equals(jwtProperties.secret())) {
            throw new IllegalStateException("JWT_SECRET must be configured for production profile.");
        }
    }
}
