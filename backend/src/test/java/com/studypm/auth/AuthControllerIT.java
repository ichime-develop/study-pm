package com.studypm.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.HttpCookie;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * 認証APIをHTTP、Spring Security、Service、Repository、PostgreSQLまで通して検証する。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AuthControllerIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRESQL = new PostgreSQLContainer<>("postgres:17");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @DynamicPropertySource
    static void registerDatasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
        registry.add("app.security.jwt.secret", () -> "study-pm-integration-test-secret-key");
        registry.add("app.security.refresh-cookie.secure", () -> "false");
    }

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.update("delete from refresh_tokens");
        jdbcTemplate.update("delete from accounts");
    }

    @Test
    void signupCreatesAccountAndRefreshTokenCookieWithoutReturningRefreshTokenBody() throws Exception {
        MvcResult result = signup("user@example.com", "Password1", "Study User");
        JsonNode responseBody = objectMapper.readTree(result.getResponse().getContentAsString());
        String rawRefreshToken = refreshTokenCookie(result).getValue();

        assertThat(responseBody.get("account").get("email").asText()).isEqualTo("user@example.com");
        assertThat(responseBody.get("account").get("displayName").asText()).isEqualTo("Study User");
        assertThat(responseBody.get("accessToken").asText()).isNotBlank();
        assertThat(responseBody.has("refreshToken")).isFalse();
        assertRefreshCookieAttributes(result);
        assertThat(rawRefreshToken).isNotBlank();

        String passwordHash = jdbcTemplate.queryForObject(
                "select password_hash from accounts where email = ?",
                String.class,
                "user@example.com"
        );
        String tokenHash = jdbcTemplate.queryForObject("select token_hash from refresh_tokens", String.class);
        assertThat(passwordHash).isNotEqualTo("Password1");
        assertThat(tokenHash).hasSize(64).isNotEqualTo(rawRefreshToken);
    }

    @Test
    void signupRejectsDuplicateEmailCaseInsensitively() throws Exception {
        signup("User@Example.com", "Password1", "First User");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "user@example.com",
                                  "password": "Password1",
                                  "displayName": "Second User"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"))
                .andExpect(jsonPath("$.details[0].field").value("email"));
    }

    @Test
    void loginReturnsAccessTokenAndRefreshCookie() throws Exception {
        signup("user@example.com", "Password1", "Study User");

        MvcResult result = login("USER@example.com", "Password1");

        JsonNode responseBody = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(responseBody.get("account").get("email").asText()).isEqualTo("user@example.com");
        assertThat(responseBody.get("accessToken").asText()).isNotBlank();
        assertThat(responseBody.has("refreshToken")).isFalse();
        assertRefreshCookieAttributes(result);
    }

    @Test
    void loginFailureDoesNotRevealWhetherEmailOrPasswordIsWrong() throws Exception {
        signup("user@example.com", "Password1", "Study User");

        String missingEmailMessage = loginExpectingBadRequest("missing@example.com", "Password1");
        String wrongPasswordMessage = loginExpectingBadRequest("user@example.com", "WrongPass1");

        assertThat(missingEmailMessage).isEqualTo("メールアドレスまたはパスワードが正しくありません。");
        assertThat(wrongPasswordMessage).isEqualTo(missingEmailMessage);
    }

    @Test
    void refreshUsesCookieTokenAndIgnoresInvalidBearerToken() throws Exception {
        MvcResult signup = signup("user@example.com", "Password1", "Study User");

        MvcResult result = mockMvc.perform(post("/api/auth/refresh")
                        .cookie(refreshTokenCookie(signup))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andReturn();

        JsonNode responseBody = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(responseBody.get("accessToken").asText()).isNotBlank();
    }

    @Test
    void refreshUsesRequestBodyToken() throws Exception {
        MvcResult signup = signup("user@example.com", "Password1", "Study User");
        String rawRefreshToken = refreshTokenCookie(signup).getValue();

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "refreshToken": "%s"
                                }
                                """.formatted(rawRefreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString());
    }

    @Test
    void invalidRefreshTokenReturnsCommonBadRequestError() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "refreshToken": "invalid-refresh-token"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"))
                .andExpect(jsonPath("$.message").value("再ログインしてください。"))
                .andExpect(jsonPath("$.details").isArray());
    }

    @Test
    void logoutRevokesRefreshTokenAndClearsCookie() throws Exception {
        MvcResult signup = signup("user@example.com", "Password1", "Study User");
        String accessToken = accessToken(signup);
        Cookie refreshTokenCookie = refreshTokenCookie(signup);

        mockMvc.perform(post("/api/auth/logout")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .cookie(refreshTokenCookie))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge("refresh_token", 0));

        Integer revokedCount = jdbcTemplate.queryForObject(
                "select count(*) from refresh_tokens where revoked_at is not null",
                Integer.class
        );
        assertThat(revokedCount).isEqualTo(1);

        mockMvc.perform(post("/api/auth/refresh").cookie(refreshTokenCookie))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void meRequiresAuthenticationAndReturnsAuthenticatedAccount() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.details").isArray());

        MvcResult signup = signup("user@example.com", "Password1", "Study User");

        mockMvc.perform(get("/api/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(signup)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("user@example.com"))
                .andExpect(jsonPath("$.displayName").value("Study User"));
    }

    @Test
    void meRejectsInvalidBearerToken() throws Exception {
        mockMvc.perform(get("/api/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    private MvcResult signup(String email, String password, String displayName) throws Exception {
        return mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "%s",
                                  "password": "%s",
                                  "displayName": "%s"
                                }
                                """.formatted(email, password, displayName)))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("refresh_token"))
                .andReturn();
    }

    private MvcResult login(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "%s",
                                  "password": "%s"
                                }
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("refresh_token"))
                .andReturn();
    }

    private String loginExpectingBadRequest(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "%s",
                                  "password": "%s"
                                }
                                """.formatted(email, password)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_FAILED"))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("message").asText();
    }

    private String accessToken(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private Cookie refreshTokenCookie(MvcResult result) {
        Cookie cookie = result.getResponse().getCookie("refresh_token");
        assertThat(cookie).isNotNull();
        return cookie;
    }

    private void assertRefreshCookieAttributes(MvcResult result) {
        List<String> cookies = result.getResponse().getHeaders(HttpHeaders.SET_COOKIE);
        assertThat(cookies).anySatisfy(cookieHeader -> {
            HttpCookie cookie = HttpCookie.parse(cookieHeader).getFirst();
            assertThat(cookie.getName()).isEqualTo("refresh_token");
            assertThat(cookie.getPath()).isEqualTo("/api/auth");
            assertThat(cookie.isHttpOnly()).isTrue();
            assertThat(cookieHeader).contains("SameSite=Lax");
        });
    }
}
