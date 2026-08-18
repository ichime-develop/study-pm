package com.studypm.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import java.util.List;

import com.studypm.auth.JwtAuthenticationFilter;
import com.studypm.common.api.ApiAccessDeniedHandler;
import com.studypm.common.api.ApiAuthenticationEntryPoint;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;

class SecurityConfigTest {

    @Test
    void allowsEveryHttpMethodUsedByTheFrontendApiClient() {
        SecurityConfig securityConfig = new SecurityConfig(
                mock(ApiAuthenticationEntryPoint.class),
                mock(ApiAccessDeniedHandler.class),
                mock(JwtAuthenticationFilter.class),
                new CorsProperties(List.of("http://localhost:5173"))
        );
        MockHttpServletRequest request = new MockHttpServletRequest(
                HttpMethod.OPTIONS.name(),
                "/api/ai-plan/drafts/draft-id"
        );

        CorsConfiguration cors = securityConfig.corsConfigurationSource().getCorsConfiguration(request);

        assertThat(cors).isNotNull();
        assertThat(cors.getAllowedMethods()).contains(
                HttpMethod.GET.name(),
                HttpMethod.POST.name(),
                HttpMethod.PUT.name(),
                HttpMethod.PATCH.name(),
                HttpMethod.DELETE.name(),
                HttpMethod.OPTIONS.name()
        );
    }
}
