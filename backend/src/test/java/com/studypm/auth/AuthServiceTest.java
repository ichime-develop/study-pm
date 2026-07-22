package com.studypm.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import com.studypm.account.Account;
import com.studypm.account.AccountRepository;
import com.studypm.common.error.InvalidRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * 認証ユースケースのパスワード保存と失敗時応答を検証する。
 */
class AuthServiceTest {

    private AccountRepository accountRepository;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private RefreshTokenService refreshTokenService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        accountRepository = mock(AccountRepository.class);
        passwordEncoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();
        jwtService = mock(JwtService.class);
        refreshTokenService = mock(RefreshTokenService.class);
        Clock clock = Clock.fixed(Instant.parse("2026-07-22T00:00:00Z"), ZoneOffset.UTC);
        authService = new AuthService(accountRepository, passwordEncoder, jwtService, refreshTokenService, clock);
    }

    @Test
    void signupStoresEncodedPasswordAndIssuesTokens() {
        when(accountRepository.existsByEmail("user@example.com")).thenReturn(false);
        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtService.issueAccessToken(any(Account.class))).thenReturn("access-token");
        when(refreshTokenService.issueRefreshToken(any(Account.class))).thenReturn("refresh-token");

        AuthSession session = authService.signup(
                new SignupCommand(" USER@Example.COM ", "Password1", " Study User ")
        );

        ArgumentCaptor<Account> accountCaptor = ArgumentCaptor.forClass(Account.class);
        verify(accountRepository).save(accountCaptor.capture());
        Account savedAccount = accountCaptor.getValue();
        assertThat(savedAccount.email()).isEqualTo("user@example.com");
        assertThat(savedAccount.displayName()).isEqualTo("Study User");
        assertThat(savedAccount.passwordHash()).isNotEqualTo("Password1");
        assertThat(passwordEncoder.matches("Password1", savedAccount.passwordHash())).isTrue();
        assertThat(session.accessToken()).isEqualTo("access-token");
        assertThat(session.refreshToken()).isEqualTo("refresh-token");
    }

    @Test
    void loginFailureDoesNotRevealWhetherEmailOrPasswordIsWrong() {
        when(accountRepository.findByEmail("user@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginCommand("user@example.com", "Password1")))
                .isInstanceOfSatisfying(InvalidRequestException.class, exception -> {
                    assertThat(exception.code()).isEqualTo("AUTHENTICATION_FAILED");
                    assertThat(exception.getMessage()).isEqualTo("メールアドレスまたはパスワードが正しくありません。");
                });
    }

    @Test
    void loginRejectsWrongPasswordWithSameMessage() {
        Account account = Account.create(
                "user@example.com",
                passwordEncoder.encode("Password1"),
                "Study User",
                Instant.parse("2026-07-22T00:00:00Z")
        );
        when(accountRepository.findByEmail("user@example.com")).thenReturn(Optional.of(account));

        assertThatThrownBy(() -> authService.login(new LoginCommand("user@example.com", "WrongPass1")))
                .isInstanceOfSatisfying(InvalidRequestException.class, exception -> {
                    assertThat(exception.code()).isEqualTo("AUTHENTICATION_FAILED");
                    assertThat(exception.getMessage()).isEqualTo("メールアドレスまたはパスワードが正しくありません。");
                });
    }
}
