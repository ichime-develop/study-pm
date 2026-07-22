package com.studypm.auth;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

import com.studypm.account.Account;
import com.studypm.account.AccountRepository;
import com.studypm.common.api.ApiErrorDetail;
import com.studypm.common.error.InvalidRequestException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * アカウント登録、ログイン、トークン再発行、ログアウトの認証ユースケースを進行する。
 */
@Service
public class AuthService {

    private static final String AUTHENTICATION_FAILED_MESSAGE = "メールアドレスまたはパスワードが正しくありません。";

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final Clock clock;

    public AuthService(
            AccountRepository accountRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenService refreshTokenService,
            Clock clock
    ) {
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.clock = clock;
    }

    @Transactional
    public AuthSession signup(SignupCommand command) {
        String email = normalizeEmail(command.email());
        if (accountRepository.existsByEmail(email)) {
            throw new InvalidRequestException(
                    "EMAIL_ALREADY_EXISTS",
                    "入力内容を確認してください。",
                    List.of(new ApiErrorDetail("email", "このメールアドレスは既に登録されています。"))
            );
        }

        Instant now = clock.instant();
        Account account = Account.create(
                email,
                passwordEncoder.encode(command.password()),
                command.displayName().trim(),
                now
        );
        Account savedAccount = accountRepository.save(account);
        return issueSession(savedAccount);
    }

    @Transactional
    public AuthSession login(LoginCommand command) {
        Account account = accountRepository.findByEmail(normalizeEmail(command.email()))
                .orElseThrow(this::authenticationFailed);
        if (!passwordEncoder.matches(command.password(), account.passwordHash())) {
            throw authenticationFailed();
        }
        return issueSession(account);
    }

    @Transactional(readOnly = true)
    public String refreshAccessToken(String refreshToken) {
        Account account = refreshTokenService.verify(refreshToken);
        return jwtService.issueAccessToken(account);
    }

    @Transactional
    public void logout(String refreshToken) {
        refreshTokenService.revoke(refreshToken);
    }

    private AuthSession issueSession(Account account) {
        return new AuthSession(
                account,
                jwtService.issueAccessToken(account),
                refreshTokenService.issueRefreshToken(account)
        );
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private InvalidRequestException authenticationFailed() {
        return new InvalidRequestException("AUTHENTICATION_FAILED", AUTHENTICATION_FAILED_MESSAGE);
    }
}
