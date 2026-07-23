package com.studypm.wbs;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
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
 * WBS CRUD APIをHTTP、認証、Service、PostgreSQLまで通して検証する。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class WbsTaskControllerIT {

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
        registry.add("app.security.jwt.secret", () -> "study-pm-wbs-integration-test-secret-key");
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
        mockMvc.perform(get("/api/projects/{projectId}/wbs", UUID.randomUUID()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.details").isArray());

        mockMvc.perform(get("/api/projects/{projectId}/wbs-summary", UUID.randomUUID()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.details").isArray());
    }

    @Test
    void createListAndGetWbsTasks() throws Exception {
        Session session = signup("user@example.com");
        UUID projectId = createProject(session);
        MvcResult parentResult = createParent(session, projectId, "Parent")
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.LOCATION, org.hamcrest.Matchers.startsWith("/api/wbs-tasks/")))
                .andExpect(jsonPath("$.taskType").value("PARENT"))
                .andReturn();
        UUID parentId = taskId(parentResult);
        MvcResult childResult = createLeaf(session, projectId, parentId, "Child", "2026-08-01", "2026-08-31", "2.50")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.parentTaskId").value(parentId.toString()))
                .andExpect(jsonPath("$.progressRate").value(0))
                .andReturn();
        UUID childId = taskId(childResult);
        createLeaf(session, projectId, null, "Root", "2026-09-01", "2026-09-30", "1.00")
                .andExpect(status().isCreated());

        assertThat(count("wbs_task_progress_history")).isEqualTo(2);

        mockMvc.perform(get("/api/projects/{projectId}/wbs", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plannedHours").value(3.50))
                .andExpect(jsonPath("$.actualHours").value(0))
                .andExpect(jsonPath("$.progressRate").value(0.0000))
                .andExpect(jsonPath("$.tasks.length()").value(3))
                .andExpect(jsonPath("$.tasks[0].wbsTaskId").value(parentId.toString()))
                .andExpect(jsonPath("$.tasks[1].wbsTaskId").value(childId.toString()))
                .andExpect(jsonPath("$.tasks[2].name").value("Root"));

        mockMvc.perform(get("/api/wbs-tasks/{taskId}", childId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.wbsTaskId").value(childId.toString()))
                .andExpect(jsonPath("$.actualHours").value(0))
                .andExpect(jsonPath("$.hasStudyLogs").value(false));
    }

    @Test
    void wbsSummaryReturnsSameAggregateAsWbsList() throws Exception {
        Session session = signup("user@example.com");
        UUID projectId = createProject(session);
        UUID leafId = taskId(createLeaf(session, projectId, null, "Leaf", "2020-07-01", "2020-07-22", "4.00")
                .andReturn());
        mockMvc.perform(patch("/api/wbs-tasks/{taskId}/progress", leafId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"progressRate\": 50 }"))
                .andExpect(status().isOk());
        insertStudyLog(session.accountId(), projectId, leafId, new BigDecimal("1.50"));

        MvcResult listResult = mockMvc.perform(get("/api/projects/{projectId}/wbs", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plannedHours").value(4.00))
                .andExpect(jsonPath("$.actualHours").value(1.50))
                .andExpect(jsonPath("$.progressRate").value(50.0000))
                .andExpect(jsonPath("$.hasDelay").value(true))
                .andReturn();

        MvcResult summaryResult = mockMvc.perform(get("/api/projects/{projectId}/wbs-summary", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectId").value(projectId.toString()))
                .andExpect(jsonPath("$.plannedHours").value(4.00))
                .andExpect(jsonPath("$.actualHours").value(1.50))
                .andExpect(jsonPath("$.progressRate").value(50.0000))
                .andExpect(jsonPath("$.hasDelay").value(true))
                .andReturn();

        JsonNode listBody = objectMapper.readTree(listResult.getResponse().getContentAsString());
        JsonNode summaryBody = objectMapper.readTree(summaryResult.getResponse().getContentAsString());
        assertThat(summaryBody.get("plannedHours").decimalValue()).isEqualByComparingTo(listBody.get("plannedHours").decimalValue());
        assertThat(summaryBody.get("actualHours").decimalValue()).isEqualByComparingTo(listBody.get("actualHours").decimalValue());
        assertThat(summaryBody.get("progressRate").decimalValue()).isEqualByComparingTo(listBody.get("progressRate").decimalValue());
        assertThat(summaryBody.get("hasDelay").booleanValue()).isEqualTo(listBody.get("hasDelay").booleanValue());
    }

    @Test
    void wbsSummaryReturnsEmptyAggregateForProjectWithoutLeafTasks() throws Exception {
        Session session = signup("user@example.com");
        UUID projectId = createProject(session);

        mockMvc.perform(get("/api/projects/{projectId}/wbs-summary", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectId").value(projectId.toString()))
                .andExpect(jsonPath("$.plannedHours").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.actualHours").value(0))
                .andExpect(jsonPath("$.progressRate").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.hasDelay").value(false));
    }

    @Test
    void wbsSummaryForOtherAccountProjectReturnsNotFound() throws Exception {
        Session owner = signup("owner@example.com");
        Session other = signup("other@example.com");
        UUID projectId = createProject(owner);

        mockMvc.perform(get("/api/projects/{projectId}/wbs-summary", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PROJECT_NOT_FOUND"));
    }

    @Test
    void updateLeafRecordsPlanHistoryAndProgressHistory() throws Exception {
        Session session = signup("user@example.com");
        UUID projectId = createProject(session);
        UUID parentId = taskId(createParent(session, projectId, "Parent").andReturn());
        UUID leafId = taskId(createLeaf(session, projectId, parentId, "Leaf", "2026-08-01", "2026-08-31", "1.00")
                .andReturn());

        mockMvc.perform(patch("/api/wbs-tasks/{taskId}", leafId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Leaf Updated",
                                  "description": null,
                                  "parentTaskId": null,
                                  "plannedStartDate": "2026-08-02",
                                  "plannedEndDate": "2026-09-01",
                                  "plannedHours": 2.00
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parentTaskId").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.plannedHours").value(2.00));
        assertThat(count("wbs_task_plan_history")).isEqualTo(1);

        mockMvc.perform(patch("/api/wbs-tasks/{taskId}/progress", leafId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"progressRate\": 0 }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.historyAdded").value(false));
        assertThat(count("wbs_task_progress_history")).isEqualTo(1);

        mockMvc.perform(patch("/api/wbs-tasks/{taskId}/progress", leafId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"progressRate\": 50 }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.historyAdded").value(true))
                .andExpect(jsonPath("$.task.progressRate").value(50));
        assertThat(count("wbs_task_progress_history")).isEqualTo(2);
    }

    @Test
    void listSortsParentByChildPlanDateBeforeLaterRootLeaf() throws Exception {
        Session session = signup("user@example.com");
        UUID projectId = createProject(session);
        UUID laterRootId = taskId(createLeaf(session, projectId, null, "Later Root", "2026-09-01", "2026-09-30", "1.00")
                .andReturn());
        UUID parentId = taskId(createParent(session, projectId, "Parent").andReturn());
        UUID earlyChildId = taskId(createLeaf(session, projectId, parentId, "Early Child", "2026-08-01", "2026-08-31", "1.00")
                .andReturn());

        mockMvc.perform(get("/api/projects/{projectId}/wbs", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks[0].wbsTaskId").value(parentId.toString()))
                .andExpect(jsonPath("$.tasks[1].wbsTaskId").value(earlyChildId.toString()))
                .andExpect(jsonPath("$.tasks[2].wbsTaskId").value(laterRootId.toString()));
    }

    @Test
    void progressUpdateReopensCompletedProject() throws Exception {
        Session session = signup("user@example.com");
        UUID projectId = createProject(session);
        UUID leafId = taskId(createLeaf(session, projectId, null, "Leaf", "2026-08-01", "2026-08-31", "1.00")
                .andReturn());

        mockMvc.perform(patch("/api/wbs-tasks/{taskId}/progress", leafId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"progressRate\": 100 }"))
                .andExpect(status().isOk());
        updateProjectStatus(session, projectId, "COMPLETED").andExpect(status().isOk());

        mockMvc.perform(patch("/api/wbs-tasks/{taskId}/progress", leafId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"progressRate\": 90 }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.historyAdded").value(true));

        assertThat(jdbcTemplate.queryForObject(
                "select status from projects where id = ?",
                String.class,
                projectId
        )).isEqualTo("IN_PROGRESS");
    }

    @Test
    void invalidHierarchyAndPlanReturnCommonErrors() throws Exception {
        Session session = signup("user@example.com");
        UUID projectId = createProject(session);
        UUID leafId = taskId(createLeaf(session, projectId, null, "Leaf", "2026-08-01", "2026-08-31", "1.00")
                .andReturn());

        createLeaf(session, projectId, leafId, "Grand Child", "2026-08-01", "2026-08-31", "1.00")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("WBS_HIERARCHY_CONFLICT"));

        mockMvc.perform(post("/api/projects/{projectId}/wbs-tasks", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "taskType": "LEAF",
                                  "name": "Invalid",
                                  "description": null,
                                  "parentTaskId": null,
                                  "plannedStartDate": "2026-09-01",
                                  "plannedEndDate": "2026-08-01",
                                  "plannedHours": 1.00
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_WBS_PLAN_DATES"));

        mockMvc.perform(post("/api/projects/{projectId}/wbs-tasks", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "taskType": "LEAF",
                                  "name": "Too Large",
                                  "description": null,
                                  "parentTaskId": null,
                                  "plannedStartDate": null,
                                  "plannedEndDate": null,
                                  "plannedHours": 10000.00
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_WBS_PLANNED_HOURS"));
    }

    @Test
    void parentProgressUpdateReturnsBadRequest() throws Exception {
        Session session = signup("user@example.com");
        UUID projectId = createProject(session);
        UUID parentId = taskId(createParent(session, projectId, "Parent").andReturn());

        mockMvc.perform(patch("/api/wbs-tasks/{taskId}/progress", parentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"progressRate\": 50 }"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_WBS_PROGRESS_TARGET"));
    }

    @Test
    void otherAccountTaskReturnsNotFound() throws Exception {
        Session owner = signup("owner@example.com");
        Session other = signup("other@example.com");
        UUID projectId = createProject(owner);
        UUID taskId = taskId(createLeaf(owner, projectId, null, "Leaf", "2026-08-01", "2026-08-31", "1.00")
                .andReturn());

        mockMvc.perform(get("/api/wbs-tasks/{taskId}", taskId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("WBS_TASK_NOT_FOUND"));

        mockMvc.perform(delete("/api/wbs-tasks/{taskId}", taskId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("WBS_TASK_NOT_FOUND"));
    }

    @Test
    void deleteRejectsLeafWithStudyLogsAndDeletesParentWithChildrenKeepingHistory() throws Exception {
        Session session = signup("user@example.com");
        UUID projectId = createProject(session);
        UUID blockedLeafId = taskId(createLeaf(session, projectId, null, "Blocked", "2026-08-01", "2026-08-31", "1.00")
                .andReturn());
        insertStudyLog(session.accountId(), projectId, blockedLeafId);

        mockMvc.perform(delete("/api/wbs-tasks/{taskId}", blockedLeafId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TASK_HAS_STUDY_LOGS"));

        UUID blockedParentId = taskId(createParent(session, projectId, "Blocked Parent").andReturn());
        UUID blockedChildId = taskId(createLeaf(session, projectId, blockedParentId, "Blocked Child", "2026-08-01", "2026-08-31", "1.00")
                .andReturn());
        insertStudyLog(session.accountId(), projectId, blockedChildId);

        mockMvc.perform(delete("/api/wbs-tasks/{taskId}", blockedParentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PARENT_HAS_STUDY_LOGS"));

        UUID parentId = taskId(createParent(session, projectId, "Parent").andReturn());
        UUID childId = taskId(createLeaf(session, projectId, parentId, "Child", "2026-08-01", "2026-08-31", "1.00")
                .andReturn());
        mockMvc.perform(patch("/api/wbs-tasks/{taskId}", childId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Child",
                                  "description": null,
                                  "parentTaskId": "%s",
                                  "plannedStartDate": "2026-08-02",
                                  "plannedEndDate": "2026-08-31",
                                  "plannedHours": 1.25
                                }
                                """.formatted(parentId)))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/wbs-tasks/{taskId}", parentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("OK"));

        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from wbs_tasks where id in (?, ?)",
                Integer.class,
                parentId,
                childId
        )).isZero();
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from wbs_task_progress_history where wbs_task_id is null",
                Integer.class
        )).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from wbs_task_plan_history where wbs_task_id is null and old_parent_wbs_task_id is null",
                Integer.class
        )).isEqualTo(1);
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

    private UUID createProject(Session session) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/projects")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Java",
                                  "description": null,
                                  "startDate": "2026-08-01",
                                  "targetEndDate": "2026-09-30"
                                }
                                """))
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
                          "name": "Java",
                          "description": null,
                          "startDate": "2026-08-01",
                          "targetEndDate": "2026-09-30",
                          "status": "%s"
                        }
                        """.formatted(status)));
    }

    private ResultActions createParent(Session session, UUID projectId, String name) throws Exception {
        return mockMvc.perform(post("/api/projects/{projectId}/wbs-tasks", projectId)
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
                        """.formatted(name)));
    }

    private ResultActions createLeaf(
            Session session,
            UUID projectId,
            UUID parentTaskId,
            String name,
            String plannedStartDate,
            String plannedEndDate,
            String plannedHours
    ) throws Exception {
        String parentJson = parentTaskId == null ? "null" : "\"%s\"".formatted(parentTaskId);
        return mockMvc.perform(post("/api/projects/{projectId}/wbs-tasks", projectId)
                .header(HttpHeaders.AUTHORIZATION, bearer(session))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "taskType": "LEAF",
                          "name": "%s",
                          "description": null,
                          "parentTaskId": %s,
                          "plannedStartDate": "%s",
                          "plannedEndDate": "%s",
                          "plannedHours": %s
                        }
                        """.formatted(name, parentJson, plannedStartDate, plannedEndDate, plannedHours)));
    }

    private UUID taskId(MvcResult result) throws Exception {
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).get("wbsTaskId").asText());
    }

    private String bearer(Session session) {
        return "Bearer " + session.accessToken();
    }

    private void insertStudyLog(UUID accountId, UUID projectId, UUID taskId) {
        insertStudyLog(accountId, projectId, taskId, new BigDecimal("1.00"));
    }

    private void insertStudyLog(UUID accountId, UUID projectId, UUID taskId, BigDecimal studyHours) {
        Instant now = Instant.parse("2026-07-01T00:00:00Z");
        jdbcTemplate.update("""
                insert into study_logs (
                    id, account_id, project_id, wbs_task_id, study_date, study_hours, memo, created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, null, ?, ?)
                """,
                UUID.randomUUID(),
                accountId,
                projectId,
                taskId,
                LocalDate.parse("2026-08-02"),
                studyHours,
                Timestamp.from(now),
                Timestamp.from(now)
        );
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
