package com.studypm.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import com.studypm.account.Account;
import com.studypm.common.error.InvalidRequestException;
import com.studypm.config.JwtProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * refresh tokenを平文保存せず、失効・期限切れを拒否することを検証する。
 */
class RefreshTokenServiceTest {

    private RefreshTokenRepository refreshTokenRepository;
    private RefreshTokenHasher refreshTokenHasher;
    private Clock clock;
    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        refreshTokenRepository = mock(RefreshTokenRepository.class);
        refreshTokenHasher = new RefreshTokenHasher();
        JwtProperties jwtProperties = new JwtProperties(
                "study-pm-test-secret-key-please-change",
                Duration.ofMinutes(15),
                Duration.ofDays(14)
        );
        clock = Clock.fixed(Instant.parse("2026-07-22T00:00:00Z"), ZoneOffset.UTC);
        refreshTokenService = new RefreshTokenService(refreshTokenRepository, refreshTokenHasher, jwtProperties, clock);
    }

    @Test
    void issueRefreshTokenStoresOnlyHash() {
        Account account = account();
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String rawToken = refreshTokenService.issueRefreshToken(account);

        ArgumentCaptor<RefreshToken> tokenCaptor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(tokenCaptor.capture());
        RefreshToken savedToken = tokenCaptor.getValue();
        assertThat(savedToken.tokenHash()).isNotEqualTo(rawToken);
        assertThat(savedToken.tokenHash()).hasSize(64);
        assertThat(savedToken.isActive(clock.instant())).isTrue();
    }

    @Test
    void verifyReturnsAccountWhenTokenIsActive() {
        Account account = account();
        String rawToken = "raw-refresh-token";
        RefreshToken storedToken = RefreshToken.create(
                account,
                refreshTokenHasher.hash(rawToken),
                clock.instant().plus(Duration.ofDays(1)),
                clock.instant()
        );
        when(refreshTokenRepository.findByTokenHash(refreshTokenHasher.hash(rawToken))).thenReturn(Optional.of(storedToken));

        Account verifiedAccount = refreshTokenService.verify(rawToken);

        assertThat(verifiedAccount).isSameAs(account);
    }

    @Test
    void verifyRejectsRevokedToken() {
        Account account = account();
        String rawToken = "raw-refresh-token";
        RefreshToken storedToken = RefreshToken.create(
                account,
                refreshTokenHasher.hash(rawToken),
                clock.instant().plus(Duration.ofDays(1)),
                clock.instant()
        );
        storedToken.revoke(clock.instant());
        when(refreshTokenRepository.findByTokenHash(refreshTokenHasher.hash(rawToken))).thenReturn(Optional.of(storedToken));

        assertThatThrownBy(() -> refreshTokenService.verify(rawToken))
                .isInstanceOfSatisfying(InvalidRequestException.class, exception ->
                        assertThat(exception.code()).isEqualTo("INVALID_REFRESH_TOKEN")
                );
    }

    @Test
    void verifyRejectsExpiredToken() {
        Account account = account();
        String rawToken = "raw-refresh-token";
        RefreshToken storedToken = RefreshToken.create(
                account,
                refreshTokenHasher.hash(rawToken),
                clock.instant().minus(Duration.ofSeconds(1)),
                clock.instant().minus(Duration.ofDays(1))
        );
        when(refreshTokenRepository.findByTokenHash(refreshTokenHasher.hash(rawToken))).thenReturn(Optional.of(storedToken));

        assertThatThrownBy(() -> refreshTokenService.verify(rawToken))
                .isInstanceOfSatisfying(InvalidRequestException.class, exception ->
                        assertThat(exception.code()).isEqualTo("INVALID_REFRESH_TOKEN")
                );
    }

    @Test
    void verifyRejectsMissingToken() {
        assertThatThrownBy(() -> refreshTokenService.verify(" "))
                .isInstanceOfSatisfying(InvalidRequestException.class, exception ->
                        assertThat(exception.code()).isEqualTo("INVALID_REFRESH_TOKEN")
                );
    }

    private Account account() {
        return Account.create(
                "user@example.com",
                "{bcrypt}hash",
                "Study User",
                clock.instant()
        );
    }
}
