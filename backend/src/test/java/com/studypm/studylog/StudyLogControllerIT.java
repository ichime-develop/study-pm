package com.studypm.studylog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.hamcrest.Matchers;
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
 * 学習記録CRUD APIをHTTP、認証、Service、PostgreSQLまで通して検証する。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class StudyLogControllerIT {

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
        registry.add("app.security.jwt.secret", () -> "study-pm-study-log-integration-test-secret-key");
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
        mockMvc.perform(get("/api/projects/{projectId}/study-logs", UUID.randomUUID()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.details").isArray());
    }

    @Test
    void createListGetUpdateAndDeleteStudyLog() throws Exception {
        Session session = signup("user@example.com");
        UUID projectId = createProject(session, "Java");
        UUID springTaskId = createLeaf(session, projectId, "Spring");
        UUID jpaTaskId = createLeaf(session, projectId, "JPA");

        MvcResult createdResult = createStudyLog(
                session,
                projectId,
                springTaskId,
                "2026-07-20",
                "1.25",
                " memo "
        )
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.LOCATION, Matchers.startsWith("/api/study-logs/")))
                .andExpect(jsonPath("$.studyLog.memo").value("memo"))
                .andExpect(jsonPath("$.summary.projectActualHours").value(1.25))
                .andExpect(jsonPath("$.summary.wbsTaskActualHours").value(1.25))
                .andExpect(jsonPath("$.summary.previousWbsTaskId").doesNotExist())
                .andReturn();
        UUID studyLogId = studyLogId(createdResult);

        createStudyLog(session, projectId, springTaskId, "2026-07-21", "2.00", null)
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/projects/{projectId}/study-logs", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalStudyHours").value(3.25))
                .andExpect(jsonPath("$.studyLogs[0].studyDate").value("2026-07-21"))
                .andExpect(jsonPath("$.studyLogs[1].studyDate").value("2026-07-20"));

        mockMvc.perform(get("/api/study-logs/{studyLogId}", studyLogId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studyLogId").value(studyLogId.toString()))
                .andExpect(jsonPath("$.wbsTaskName").value("Spring"));

        mockMvc.perform(patch("/api/study-logs/{studyLogId}", studyLogId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "wbsTaskId": "%s",
                                  "studyDate": "2020-01-01",
                                  "studyHours": 0.50,
                                  "memo": "updated"
                                }
                                """.formatted(jpaTaskId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studyLog.wbsTaskId").value(jpaTaskId.toString()))
                .andExpect(jsonPath("$.summary.projectActualHours").value(2.50))
                .andExpect(jsonPath("$.summary.wbsTaskActualHours").value(0.50))
                .andExpect(jsonPath("$.summary.previousWbsTaskId").value(springTaskId.toString()))
                .andExpect(jsonPath("$.summary.previousWbsTaskActualHours").value(2.00));

        mockMvc.perform(delete("/api/study-logs/{studyLogId}", studyLogId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("OK"))
                .andExpect(jsonPath("$.summary.projectActualHours").value(2.00))
                .andExpect(jsonPath("$.summary.wbsTaskId").value(jpaTaskId.toString()))
                .andExpect(jsonPath("$.summary.wbsTaskActualHours").value(0.00));

        assertThat(count("study_logs")).isEqualTo(1);
    }

    @Test
    void listFiltersByTaskAndPaginates() throws Exception {
        Session session = signup("user@example.com");
        UUID projectId = createProject(session, "Java");
        UUID springTaskId = createLeaf(session, projectId, "Spring");
        UUID jpaTaskId = createLeaf(session, projectId, "JPA");
        createStudyLog(session, projectId, springTaskId, "2026-07-20", "1.00", null)
                .andExpect(status().isCreated());
        createStudyLog(session, projectId, springTaskId, "2026-07-21", "2.00", null)
                .andExpect(status().isCreated());
        createStudyLog(session, projectId, jpaTaskId, "2026-07-22", "3.00", null)
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/projects/{projectId}/study-logs", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .queryParam("taskId", springTaskId.toString())
                        .queryParam("page", "0")
                        .queryParam("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalStudyHours").value(3.00))
                .andExpect(jsonPath("$.studyLogs.length()").value(1))
                .andExpect(jsonPath("$.studyLogs[0].studyDate").value("2026-07-21"))
                .andExpect(jsonPath("$.page.totalElements").value(2))
                .andExpect(jsonPath("$.page.totalPages").value(2));
    }

    @Test
    void createRejectsInvalidDateHoursAndParentTask() throws Exception {
        Session session = signup("user@example.com");
        UUID projectId = createProject(session, "Java");
        UUID parentTaskId = createParent(session, projectId, "Parent");
        UUID leafTaskId = createLeaf(session, projectId, "Spring");

        createStudyLog(session, projectId, leafTaskId, "2999-01-01", "1.00", null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_STUDY_DATE"));

        createStudyLog(session, projectId, leafTaskId, "2026-07-20", "1.10", null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_STUDY_HOURS"));

        createStudyLog(session, projectId, parentTaskId, "2026-07-20", "1.00", null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_STUDY_LOG_TASK"));
    }

    @Test
    void anotherAccountResourcesAreHiddenAsNotFound() throws Exception {
        Session owner = signup("owner@example.com");
        UUID projectId = createProject(owner, "Java");
        UUID taskId = createLeaf(owner, projectId, "Spring");
        UUID studyLogId = studyLogId(createStudyLog(owner, projectId, taskId, "2026-07-20", "1.00", null)
                .andReturn());
        Session another = signup("another@example.com");

        mockMvc.perform(get("/api/study-logs/{studyLogId}", studyLogId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(another)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("STUDY_LOG_NOT_FOUND"));

        mockMvc.perform(post("/api/projects/{projectId}/study-logs", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(another))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "wbsTaskId": "%s",
                                  "studyDate": "2026-07-20",
                                  "studyHours": 1.00,
                                  "memo": null
                                }
                                """.formatted(taskId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PROJECT_NOT_FOUND"));
    }

    @Test
    void updateRejectsLeafInAnotherProject() throws Exception {
        Session session = signup("user@example.com");
        UUID projectId = createProject(session, "Java");
        UUID anotherProjectId = createProject(session, "AWS");
        UUID taskId = createLeaf(session, projectId, "Spring");
        UUID anotherProjectTaskId = createLeaf(session, anotherProjectId, "EC2");
        UUID studyLogId = studyLogId(createStudyLog(session, projectId, taskId, "2026-07-20", "1.00", null)
                .andReturn());

        mockMvc.perform(patch("/api/study-logs/{studyLogId}", studyLogId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "wbsTaskId": "%s",
                                  "studyDate": "2026-07-20",
                                  "studyHours": 1.00,
                                  "memo": null
                                }
                                """.formatted(anotherProjectTaskId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_STUDY_LOG_TASK"));
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
                                  "startDate": "2026-07-01",
                                  "targetEndDate": "2026-08-31"
                                }
                                """.formatted(name)))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).get("projectId").asText());
    }

    private UUID createParent(Session session, UUID projectId, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/projects/{projectId}/wbs-tasks", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "taskType": "PARENT",
                                  "name": "%s",
                                  "description": null,
                                  "parentTaskId": null,
                                  "plannedStartDate": null,
                                  "plannedEndDate": null,
                                  "plannedHours": null
                                }
                                """.formatted(name)))
                .andExpect(status().isCreated())
                .andReturn();
        return taskId(result);
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
                                  "plannedStartDate": "2026-07-01",
                                  "plannedEndDate": "2026-07-31",
                                  "plannedHours": 2.00
                                }
                                """.formatted(name)))
                .andExpect(status().isCreated())
                .andReturn();
        return taskId(result);
    }

    private ResultActions createStudyLog(
            Session session,
            UUID projectId,
            UUID taskId,
            String studyDate,
            String studyHours,
            String memo
    ) throws Exception {
        String memoJson = memo == null ? "null" : "\"%s\"".formatted(memo);
        return mockMvc.perform(post("/api/projects/{projectId}/study-logs", projectId)
                .header(HttpHeaders.AUTHORIZATION, bearer(session))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "wbsTaskId": "%s",
                          "studyDate": "%s",
                          "studyHours": %s,
                          "memo": %s
                        }
                        """.formatted(taskId, studyDate, studyHours, memoJson)));
    }

    private UUID taskId(MvcResult result) throws Exception {
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).get("wbsTaskId").asText());
    }

    private UUID studyLogId(MvcResult result) throws Exception {
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString())
                .get("studyLog")
                .get("studyLogId")
                .asText());
    }

    private String bearer(Session session) {
        return "Bearer " + session.accessToken();
    }

    private int count(String tableName) {
        return jdbcTemplate.queryForObject("select count(*) from " + tableName, Integer.class);
    }

    private record Session(
            String accessToken,
            UUID accountId
    ) {
    }
}
