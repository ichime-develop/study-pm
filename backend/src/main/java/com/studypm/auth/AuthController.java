package com.studypm.auth;

import com.studypm.config.RefreshTokenCookieProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * アカウント登録、ログイン、ログアウト、トークン再発行、認証中アカウント取得APIを提供する。
 */
@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenCookieWriter refreshTokenCookieWriter;
    private final RefreshTokenCookieProperties refreshTokenCookieProperties;

    public AuthController(
            AuthService authService,
            RefreshTokenCookieWriter refreshTokenCookieWriter,
            RefreshTokenCookieProperties refreshTokenCookieProperties
    ) {
        this.authService = authService;
        this.refreshTokenCookieWriter = refreshTokenCookieWriter;
        this.refreshTokenCookieProperties = refreshTokenCookieProperties;
    }

    @PostMapping("/auth/signup")
    AuthResponse signup(@Valid @RequestBody SignupRequest request, HttpServletResponse response) {
        AuthSession session = authService.signup(
                new SignupCommand(request.email(), request.password(), request.displayName())
        );
        refreshTokenCookieWriter.write(response, session.refreshToken());
        return new AuthResponse(AccountResponse.from(session.account()), session.accessToken());
    }

    @PostMapping("/auth/login")
    AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        AuthSession session = authService.login(new LoginCommand(request.email(), request.password()));
        refreshTokenCookieWriter.write(response, session.refreshToken());
        return new AuthResponse(AccountResponse.from(session.account()), session.accessToken());
    }

    @PostMapping("/auth/refresh")
    AccessTokenResponse refresh(
            @RequestBody(required = false) RefreshTokenRequest request,
            HttpServletRequest servletRequest
    ) {
        String refreshToken = resolveRefreshToken(request, servletRequest);
        return new AccessTokenResponse(authService.refreshAccessToken(refreshToken));
    }

    @PostMapping("/auth/logout")
    SuccessResponse logout(
            @RequestBody(required = false) RefreshTokenRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse response
    ) {
        authService.logout(resolveRefreshToken(request, servletRequest));
        refreshTokenCookieWriter.clear(response);
        return SuccessResponse.ok();
    }

    @GetMapping("/me")
    AccountResponse me(@AuthenticationPrincipal AuthenticatedAccount account) {
        return AccountResponse.from(account);
    }

    private String resolveRefreshToken(RefreshTokenRequest request, HttpServletRequest servletRequest) {
        if (request != null && request.refreshToken() != null && !request.refreshToken().isBlank()) {
            return request.refreshToken();
        }
        if (servletRequest.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : servletRequest.getCookies()) {
            if (refreshTokenCookieProperties.name().equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
