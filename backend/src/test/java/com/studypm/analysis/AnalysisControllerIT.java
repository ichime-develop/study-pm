package com.studypm.analysis;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
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
 * 分析APIをHTTP、認証、PostgreSQLまで通して検証する。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AnalysisControllerIT {

    private static final ZoneId JST = ZoneId.of("Asia/Tokyo");

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
        registry.add("app.security.jwt.secret", () -> "study-pm-analysis-integration-test-secret-key");
        registry.add("app.security.refresh-cookie.secure", () -> "false");
    }

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.update("delete from study_logs");
        jdbcTemplate.update("delete from wbs_task_plan_history");
        jdbcTemplate.update("delete from wbs_task_progress_history");
        jdbcTemplate.update("delete from wbs_tasks");
        jdbcTemplate.update("delete from project_period_history");
        jdbcTemplate.update("delete from projects");
        jdbcTemplate.update("delete from refresh_tokens");
        jdbcTemplate.update("delete from accounts");
    }

    @Test
    void analysisReturnsMetricsBurndownAndPlanWarningsOnlyForOwnedProject() throws Exception {
        LocalDate today = LocalDate.now(JST);
        Session owner = signup("owner@example.com");
        Session other = signup("other@example.com");
        UUID projectId = insertProject(owner.accountId(), today.minusDays(5), today.plusDays(5));
        UUID taskId = insertLeaf(projectId, "Task", today.minusDays(3), today.plusDays(2), new BigDecimal("10.00"), 50);
        insertStudyLog(owner.accountId(), projectId, taskId, today, new BigDecimal("2.00"));
        insertProgressHistory(owner.accountId(), projectId, taskId, 50, Instant.now());
        insertLeaf(projectId, "Outside", today.minusDays(6), today.plusDays(6), new BigDecimal("5.00"), 0);

        mockMvc.perform(get("/api/projects/{projectId}/analysis/evm", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isCalculable").value(true))
                .andExpect(jsonPath("$.bac").value(15.00))
                .andExpect(jsonPath("$.ac").value(2.00));

        mockMvc.perform(get("/api/projects/{projectId}/analysis/burndown", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isCalculable").value(true))
                .andExpect(jsonPath("$.idealPoints").isArray())
                .andExpect(jsonPath("$.actualPoints").isArray());

        mockMvc.perform(get("/api/projects/{projectId}/analysis/plan-warnings", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.warnings.length()").value(2));

        mockMvc.perform(get("/api/projects/{projectId}/analysis/evm", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PROJECT_NOT_FOUND"));
    }

    @Test
    void analysisReturnsNormalUnavailableStateForMissingSchedule() throws Exception {
        Session owner = signup("owner@example.com");
        LocalDate today = LocalDate.now(JST);
        UUID projectId = insertProject(owner.accountId(), today.minusDays(3), today.plusDays(3));
        insertLeaf(projectId, "No schedule", null, null, new BigDecimal("10.00"), 0);

        mockMvc.perform(get("/api/projects/{projectId}/analysis/evm", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isCalculable").value(false))
                .andExpect(jsonPath("$.unavailableReasons[0]").value("MISSING_SCHEDULE"))
                .andExpect(jsonPath("$.bac").value(org.hamcrest.Matchers.nullValue()));
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

    private UUID insertProject(UUID accountId, LocalDate startDate, LocalDate targetEndDate) {
        UUID projectId = UUID.randomUUID();
        Timestamp now = Timestamp.from(Instant.now());
        jdbcTemplate.update("""
                insert into projects (id, account_id, name, description, start_date, target_end_date, status, created_at, updated_at)
                values (?, ?, 'Analysis', null, ?, ?, 'IN_PROGRESS', ?, ?)
                """, projectId, accountId, startDate, targetEndDate, now, now);
        return projectId;
    }

    private UUID insertLeaf(
            UUID projectId,
            String name,
            LocalDate plannedStartDate,
            LocalDate plannedEndDate,
            BigDecimal plannedHours,
            int progressRate
    ) {
        UUID taskId = UUID.randomUUID();
        Timestamp now = Timestamp.from(Instant.now());
        jdbcTemplate.update("""
                insert into wbs_tasks (
                    id, project_id, parent_wbs_task_id, task_type, name, description,
                    planned_start_date, planned_end_date, planned_hours, progress_rate, created_at, updated_at
                ) values (?, ?, null, 'LEAF', ?, null, ?, ?, ?, ?, ?, ?)
                """, taskId, projectId, name, plannedStartDate, plannedEndDate, plannedHours, progressRate, now, now);
        return taskId;
    }

    private void insertStudyLog(UUID accountId, UUID projectId, UUID taskId, LocalDate studyDate, BigDecimal studyHours) {
        Timestamp now = Timestamp.from(Instant.now());
        jdbcTemplate.update("""
                insert into study_logs (id, account_id, project_id, wbs_task_id, study_date, study_hours, memo, created_at, updated_at)
                values (?, ?, ?, ?, ?, ?, null, ?, ?)
                """, UUID.randomUUID(), accountId, projectId, taskId, studyDate, studyHours, now, now);
    }

    private void insertProgressHistory(UUID accountId, UUID projectId, UUID taskId, int progressRate, Instant changedAt) {
        jdbcTemplate.update("""
                insert into wbs_task_progress_history (
                    id, wbs_task_id, project_id, task_name_snapshot, progress_rate, changed_by_account_id, changed_at
                ) values (?, ?, ?, 'Task', ?, ?, ?)
                """, UUID.randomUUID(), taskId, projectId, progressRate, accountId, Timestamp.from(changedAt));
    }

    private String bearer(Session session) {
        return "Bearer " + session.accessToken();
    }

    private record Session(String accessToken, UUID accountId) {
    }
}
