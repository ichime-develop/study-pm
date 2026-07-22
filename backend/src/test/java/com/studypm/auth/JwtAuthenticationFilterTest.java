package com.studypm.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import com.studypm.account.Account;
import com.studypm.account.AccountRepository;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * JWT検証失敗時もpermitAll APIの別資格情報フローを妨げないことを検証する。
 */
class JwtAuthenticationFilterTest {

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void invalidAccessTokenDoesNotBlockFilterChain() throws Exception {
        JwtService jwtService = mock(JwtService.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, accountRepository);
        when(jwtService.parseAccountId("expired-token")).thenThrow(new JwtException("expired"));
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/refresh");
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer expired-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        filter.doFilter(request, response, filterChain);

        verify(jwtService).parseAccountId("expired-token");
        assertThat(filterChain.getRequest()).isSameAs(request);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void downstreamExceptionAfterAuthenticationIsNotHandledAsJwtFailure() {
        JwtService jwtService = mock(JwtService.class);
        AccountRepository accountRepository = mock(AccountRepository.class);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, accountRepository);
        UUID accountId = UUID.randomUUID();
        Account account = Account.create(
                "user@example.com",
                "{bcrypt}hash",
                "Study User",
                Instant.parse("2026-07-22T00:00:00Z")
        );
        when(jwtService.parseAccountId("valid-token")).thenReturn(accountId);
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(account));
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/projects/not-a-uuid");
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer valid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertThatThrownBy(() -> filter.doFilter(request, response, (servletRequest, servletResponse) -> {
            throw new IllegalArgumentException("downstream");
        }))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("downstream");
    }
}
