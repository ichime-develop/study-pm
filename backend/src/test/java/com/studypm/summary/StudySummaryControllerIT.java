package com.studypm.summary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * 学習サマリーAPIをHTTP、認証、Service、PostgreSQLまで通して検証する。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class StudySummaryControllerIT {

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
        registry.add("app.security.jwt.secret", () -> "study-pm-summary-integration-test-secret-key");
        registry.add("app.security.refresh-cookie.secure", () -> "false");
    }

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.update("delete from study_logs");
        jdbcTemplate.update("delete from wbs_task_plan_history");
        jdbcTemplate.update("delete from wbs_task_progress_history");
        jdbcTemplate.update("delete from wbs_tasks where task_type = 'LEAF'");
        jdbcTemplate.update("delete from wbs_tasks where task_type = 'PARENT'");
        jdbcTemplate.update("delete from project_period_history");
        jdbcTemplate.update("delete from projects");
        jdbcTemplate.update("delete from refresh_tokens");
        jdbcTemplate.update("delete from accounts");
    }

    @Test
    void unauthenticatedRequestReturnsCommonUnauthorizedError() throws Exception {
        mockMvc.perform(get("/api/me/study-summary"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.details").isArray());
    }

    @Test
    void summaryUsesOnlyAuthenticatedAccountStudyLogsAndProjects() throws Exception {
        LocalDate today = LocalDate.now(JST);
        Session owner = signup("owner@example.com");
        UUID ownerProjectId = createProject(owner, "Java");
        UUID ownerTaskId = createLeaf(owner, ownerProjectId, "Spring");
        createStudyLog(owner, ownerProjectId, ownerTaskId, today.toString(), "1.25")
                .andExpect(status().isCreated());
        createStudyLog(owner, ownerProjectId, ownerTaskId, today.minusDays(1).toString(), "2.00")
                .andExpect(status().isCreated());
        createStudyLog(owner, ownerProjectId, ownerTaskId, today.minusDays(2).toString(), "0.75")
                .andExpect(status().isCreated());
        updateProjectStatus(owner, ownerProjectId, "IN_PROGRESS").andExpect(status().isOk());

        UUID notStartedProjectId = createProject(owner, "AWS");
        UUID notStartedTaskId = createLeaf(owner, notStartedProjectId, "EC2");
        createStudyLog(owner, notStartedProjectId, notStartedTaskId, today.minusDays(4).toString(), "9.00")
                .andExpect(status().isCreated());

        Session other = signup("other@example.com");
        UUID otherProjectId = createProject(other, "Secret");
        UUID otherTaskId = createLeaf(other, otherProjectId, "Hidden");
        createStudyLog(other, otherProjectId, otherTaskId, today.toString(), "8.00")
                .andExpect(status().isCreated());
        updateProjectStatus(other, otherProjectId, "IN_PROGRESS").andExpect(status().isOk());

        mockMvc.perform(get("/api/me/study-summary")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.continuousStudyDays").value(3))
                .andExpect(jsonPath("$.totalStudyHours").value(13.00))
                .andExpect(jsonPath("$.inProgressProjectCount").value(1));
    }

    @Test
    void summaryStartsContinuousDaysFromYesterdayWhenTodayDoesNotHaveStudyLog() throws Exception {
        LocalDate today = LocalDate.now(JST);
        Session session = signup("user@example.com");
        UUID projectId = createProject(session, "Java");
        UUID taskId = createLeaf(session, projectId, "Spring");
        createStudyLog(session, projectId, taskId, today.minusDays(1).toString(), "1.00")
                .andExpect(status().isCreated());
        createStudyLog(session, projectId, taskId, today.minusDays(2).toString(), "1.00")
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/me/study-summary")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.continuousStudyDays").value(2))
                .andExpect(jsonPath("$.totalStudyHours").value(2.00));
    }

    @Test
    void deletedProjectStudyLogsAreExcludedFromSummary() throws Exception {
        LocalDate today = LocalDate.now(JST);
        Session session = signup("user@example.com");
        UUID projectId = createProject(session, "Java");
        UUID taskId = createLeaf(session, projectId, "Spring");
        createStudyLog(session, projectId, taskId, today.toString(), "2.00")
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/projects/{projectId}", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/me/study-summary")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.continuousStudyDays").value(0))
                .andExpect(jsonPath("$.totalStudyHours").value(0))
                .andExpect(jsonPath("$.inProgressProjectCount").value(0));
        assertThat(jdbcTemplate.queryForObject("select count(*) from study_logs", Integer.class)).isZero();
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

    private UUID createProject(Session session, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/projects")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "%s",
                                  "description": null,
                                  "startDate": "2020-01-01",
                                  "targetEndDate": "2099-12-31"
                                }
                                """.formatted(name)))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).get("projectId").asText());
    }

    private ResultActions updateProjectStatus(Session session, UUID projectId, String status) throws Exception {
        return mockMvc.perform(patch("/api/projects/{projectId}", projectId)
                .header(HttpHeaders.AUTHORIZATION, bearer(session))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "name": "Updated",
                          "description": null,
                          "startDate": "2020-01-01",
                          "targetEndDate": "2099-12-31",
                          "status": "%s"
                        }
                        """.formatted(status)));
    }

    private UUID createLeaf(Session session, UUID projectId, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/projects/{projectId}/wbs-tasks", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "taskType": "LEAF",
                                  "name": "%s",
                                  "description": null,
                                  "parentTaskId": null,
                                  "plannedStartDate": "2020-01-01",
                                  "plannedEndDate": "2099-12-31",
                                  "plannedHours": 2.00
                                }
                                """.formatted(name)))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).get("wbsTaskId").asText());
    }

    private ResultActions createStudyLog(
            Session session,
            UUID projectId,
            UUID taskId,
            String studyDate,
            String studyHours
    ) throws Exception {
        return mockMvc.perform(post("/api/projects/{projectId}/study-logs", projectId)
                .header(HttpHeaders.AUTHORIZATION, bearer(session))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "wbsTaskId": "%s",
                          "studyDate": "%s",
                          "studyHours": %s,
                          "memo": null
                        }
                        """.formatted(taskId, studyDate, studyHours)));
    }

    private String bearer(Session session) {
        return "Bearer " + session.accessToken();
    }

    private record Session(
            String accessToken,
            UUID accountId
    ) {
    }
}
