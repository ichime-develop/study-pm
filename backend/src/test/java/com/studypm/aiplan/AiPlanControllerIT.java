package com.studypm.aiplan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
 * AI計画APIの入力元置換とジョブ制約をPostgreSQLまで通して検証する。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AiPlanControllerIT {

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
        registry.add("app.security.jwt.secret", () -> "study-pm-ai-plan-integration-test-secret-key");
        registry.add("app.security.refresh-cookie.secure", () -> "false");
        registry.add("app.ai.enabled", () -> "true");
        registry.add("app.ai.openai.api-key", () -> "test-openai-api-key");
    }

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.update("delete from ai_plan_drafts");
        jdbcTemplate.update("delete from ai_generation_jobs");
        jdbcTemplate.update("delete from ai_plan_sources");
        jdbcTemplate.update("delete from ai_plan_generation_requests");
        jdbcTemplate.update("delete from refresh_tokens");
        jdbcTemplate.update("delete from accounts");
    }

    @Test
    void replacesSourcesWithTheSameTemporaryKey() throws Exception {
        Session session = signup("source@example.com");
        UUID requestId = createRequest(session, "initial content");

        mockMvc.perform(put("/api/ai-plan/requests/{requestId}", requestId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestPayload("updated content")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sources[0].temporaryKey").value("source-1"))
                .andExpect(jsonPath("$.sources[0].textContent").value("updated content"));

        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from ai_plan_sources where ai_plan_generation_request_id = ?", Integer.class, requestId
        )).isEqualTo(1);
    }

    @Test
    void expiresAnActiveJobBeforeCreatingTheNextJob() throws Exception {
        Session session = signup("job@example.com");
        UUID requestId = createRequest(session, "content");
        UUID expiredJobId = insertProcessingJob(session.accountId(), requestId, Instant.now().minusSeconds(1));

        mockMvc.perform(post("/api/ai-plan/requests/{requestId}/draft-jobs", requestId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"deadlinePriority\": false }"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("QUEUED"));

        assertThat(jdbcTemplate.queryForObject(
                "select status from ai_generation_jobs where id = ?", String.class, expiredJobId
        )).isEqualTo("FAILED");
        assertThat(jdbcTemplate.queryForObject("""
                select count(*) from ai_generation_jobs
                where account_id = ? and status in ('QUEUED', 'PROCESSING', 'CANCEL_REQUESTED')
                """, Integer.class, session.accountId())).isEqualTo(1);
    }

    @Test
    void rejectsANewJobWhileAnotherJobIsStillActive() throws Exception {
        Session session = signup("active@example.com");
        UUID requestId = createRequest(session, "content");
        insertProcessingJob(session.accountId(), requestId, Instant.now().plusSeconds(300));

        mockMvc.perform(post("/api/ai-plan/requests/{requestId}/draft-jobs", requestId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"deadlinePriority\": false }"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("AI_JOB_ALREADY_ACTIVE"));

        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from ai_generation_jobs where account_id = ?", Integer.class, session.accountId()
        )).isEqualTo(1);
    }

    @Test
    void hidesAiPlanResourcesOwnedByAnotherAccount() throws Exception {
        Session owner = signup("owner@example.com");
        UUID requestId = createRequest(owner, "content");
        UUID jobId = insertProcessingJob(owner.accountId(), requestId, Instant.now().plusSeconds(300));
        Session other = signup("other@example.com");

        mockMvc.perform(get("/api/ai-plan/requests/{requestId}", requestId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("AI_PLAN_NOT_FOUND"));
        mockMvc.perform(put("/api/ai-plan/requests/{requestId}", requestId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestPayload("hijacked")))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/ai-plan/requests/{requestId}/draft-jobs", requestId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"deadlinePriority\": false }"))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/ai-plan/jobs/{jobId}", jobId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/ai-plan/jobs/{jobId}/cancel", jobId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound());

        assertThat(jdbcTemplate.queryForObject(
                "select text_content from ai_plan_sources where ai_plan_generation_request_id = ?", String.class, requestId
        )).isEqualTo("content");
        assertThat(jdbcTemplate.queryForObject(
                "select status from ai_generation_jobs where id = ?", String.class, jobId
        )).isEqualTo("PROCESSING");
    }

    private UUID createRequest(Session session, String content) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/ai-plan/requests")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestPayload(content)))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString())
                .get("generationRequestId").asText());
    }

    private Session signup(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "%s",
                                  "password": "Password1",
                                  "displayName": "User"
                                }
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return new Session(
                body.get("accessToken").asText(),
                UUID.fromString(body.get("account").get("accountId").asText())
        );
    }

    private UUID insertProcessingJob(UUID accountId, UUID requestId, Instant deadlineAt) {
        UUID jobId = UUID.randomUUID();
        Instant now = Instant.now();
        jdbcTemplate.update("""
                insert into ai_generation_jobs (
                    id, ai_plan_generation_request_id, account_id, job_type, status, deadline_at, deadline_priority,
                    attempt_count, schema_regeneration_count, model_name, prompt_version, schema_version, strategy_version,
                    created_at, updated_at
                ) values (?, ?, ?, 'WBS_GENERATION', 'PROCESSING', ?, false, 0, 0, 'test-model', 'v1', 'v1', 'v1', ?, ?)
                """,
                jobId, requestId, accountId, Timestamp.from(deadlineAt), Timestamp.from(now.minusSeconds(60)), Timestamp.from(now)
        );
        return jobId;
    }

    private String requestPayload(String content) {
        return """
                {
                  "sourceType": "OVERVIEW",
                  "learningGoal": "Java Silverに合格する",
                  "startDate": "2026-08-01",
                  "targetEndDate": "2026-09-01",
                  "constraints": {},
                  "sources": [
                    {
                      "temporaryKey": "source-1",
                      "sourceType": "OVERVIEW",
                      "sourceOrder": 0,
                      "label": "概要",
                      "textContent": "%s"
                    }
                  ]
                }
                """.formatted(content);
    }

    private String bearer(Session session) {
        return "Bearer " + session.accessToken();
    }

    private record Session(String accessToken, UUID accountId) {
    }
}
