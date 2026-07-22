package com.studypm.auth;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;

import com.studypm.account.Account;
import com.studypm.common.error.InvalidRequestException;
import com.studypm.config.JwtProperties;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * refresh tokenの発行、ハッシュ保存、検証、失効を担当する。
 */
@Service
public class RefreshTokenService {

    private static final int TOKEN_BYTES = 32;

    private final RefreshTokenRepository refreshTokenRepository;
    private final RefreshTokenHasher refreshTokenHasher;
    private final JwtProperties jwtProperties;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            RefreshTokenHasher refreshTokenHasher,
            JwtProperties jwtProperties,
            Clock clock
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenHasher = refreshTokenHasher;
        this.jwtProperties = jwtProperties;
        this.clock = clock;
    }

    @Transactional
    public String issueRefreshToken(Account account) {
        String refreshToken = newRefreshToken();
        Instant now = clock.instant();
        RefreshToken savedToken = RefreshToken.create(
                account,
                refreshTokenHasher.hash(refreshToken),
                now.plus(jwtProperties.refreshTokenTtl()),
                now
        );
        refreshTokenRepository.save(savedToken);
        return refreshToken;
    }

    @Transactional(readOnly = true)
    public Account verify(String refreshToken) {
        String tokenHash = refreshTokenHasher.hash(requireRefreshToken(refreshToken));
        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(this::invalidRefreshToken);
        if (!storedToken.isActive(clock.instant())) {
            throw invalidRefreshToken();
        }
        return storedToken.account();
    }

    @Transactional
    public void revoke(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        String tokenHash = refreshTokenHasher.hash(refreshToken);
        refreshTokenRepository.findByTokenHash(tokenHash)
                .ifPresent(token -> token.revoke(clock.instant()));
    }

    private String newRefreshToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String requireRefreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw invalidRefreshToken();
        }
        return refreshToken;
    }

    private InvalidRequestException invalidRefreshToken() {
        return new InvalidRequestException("INVALID_REFRESH_TOKEN", "再ログインしてください。");
    }
}
