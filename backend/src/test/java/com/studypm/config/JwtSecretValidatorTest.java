package com.studypm.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

/**
 * JWT署名鍵の本番向け起動時検証を確認する。
 */
class JwtSecretValidatorTest {

    @Test
    void acceptsDevelopmentSecretOutsideProdProfile() {
        JwtProperties jwtProperties = new JwtProperties(
                JwtProperties.DEVELOPMENT_SECRET,
                Duration.ofMinutes(15),
                Duration.ofDays(14)
        );
        MockEnvironment environment = new MockEnvironment();
        JwtSecretValidator validator = new JwtSecretValidator(jwtProperties, environment);

        assertThatCode(validator::afterPropertiesSet).doesNotThrowAnyException();
    }

    @Test
    void rejectsDevelopmentSecretInProdProfile() {
        JwtProperties jwtProperties = new JwtProperties(
                JwtProperties.DEVELOPMENT_SECRET,
                Duration.ofMinutes(15),
                Duration.ofDays(14)
        );
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        JwtSecretValidator validator = new JwtSecretValidator(jwtProperties, environment);

        assertThatThrownBy(validator::afterPropertiesSet)
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("JWT_SECRET must be configured for production profile.");
    }
}
