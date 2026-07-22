package com.studypm.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import com.studypm.account.Account;
import com.studypm.config.JwtProperties;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

/**
 * JWT access tokenからアカウントIDを復元できることを検証する。
 */
class JwtServiceTest {

    @Test
    void issueAccessTokenCanBeParsedToAccountId() {
        Clock clock = Clock.fixed(Instant.parse("2026-07-22T00:00:00Z"), ZoneOffset.UTC);
        JwtProperties jwtProperties = new JwtProperties(
                "study-pm-test-secret-key-please-change",
                Duration.ofMinutes(15),
                Duration.ofDays(14)
        );
        JwtService jwtService = new JwtService(jwtProperties, clock);
        Account account = Account.create("user@example.com", "{bcrypt}hash", "Study User", clock.instant());

        String accessToken = jwtService.issueAccessToken(account);

        assertThat(jwtService.parseAccountId(accessToken)).isEqualTo(account.id());
    }

    @Test
    void parseAccountIdRejectsExpiredToken() {
        Clock clock = Clock.fixed(Instant.parse("2026-07-22T00:00:00Z"), ZoneOffset.UTC);
        JwtProperties jwtProperties = new JwtProperties(
                "study-pm-test-secret-key-please-change",
                Duration.ofSeconds(-1),
                Duration.ofDays(14)
        );
        JwtService jwtService = new JwtService(jwtProperties, clock);
        Account account = Account.create("user@example.com", "{bcrypt}hash", "Study User", clock.instant());
        String accessToken = jwtService.issueAccessToken(account);

        assertThatThrownBy(() -> jwtService.parseAccountId(accessToken))
                .isInstanceOf(JwtException.class);
    }
}
