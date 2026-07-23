package com.studypm.project;

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
 * Project CRUD APIをHTTP、認証、Service、PostgreSQLまで通して検証する。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ProjectControllerIT {

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
        registry.add("app.security.jwt.secret", () -> "study-pm-project-integration-test-secret-key");
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
        mockMvc.perform(get("/api/projects"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.details").isArray());
    }

    @Test
    void createGetUpdateAndDeleteProject() throws Exception {
        Session session = signup("user@example.com");

        MvcResult created = createProject(session, "Java", "Backend", "2026-08-01", "2026-09-01")
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.LOCATION, org.hamcrest.Matchers.startsWith("/api/projects/")))
                .andExpect(jsonPath("$.status").value("NOT_STARTED"))
                .andReturn();
        UUID projectId = projectId(created);

        mockMvc.perform(get("/api/projects/{projectId}", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectId").value(projectId.toString()))
                .andExpect(jsonPath("$.name").value("Java"));

        mockMvc.perform(patch("/api/projects/{projectId}", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Java Updated",
                                  "description": "",
                                  "startDate": "2026-08-02",
                                  "targetEndDate": "2026-09-02",
                                  "status": "IN_PROGRESS"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Java Updated"))
                .andExpect(jsonPath("$.description").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
        assertThat(count("project_period_history")).isEqualTo(1);

        mockMvc.perform(delete("/api/projects/{projectId}", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("OK"));

        mockMvc.perform(get("/api/projects/{projectId}", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PROJECT_NOT_FOUND"));
    }

    @Test
    void listReturnsOwnedProjectsAndSupportsKeywordStatusPagingAndSort() throws Exception {
        Session session = signup("user@example.com");
        Session other = signup("other@example.com");
        insertProject(session.accountId(), "Java 100% Basics", "Backend", "IN_PROGRESS", "2026-08-01", "2026-09-01", 3);
        insertProject(session.accountId(), "java_api", "API", "IN_PROGRESS", "2026-09-01", "2026-10-01", 2);
        insertProject(session.accountId(), "Other", "Book", "COMPLETED", "2026-07-01", "2026-07-31", 1);
        insertProject(other.accountId(), "Java 100% Secret", "Hidden", "IN_PROGRESS", "2026-06-01", "2026-06-30", 4);

        mockMvc.perform(get("/api/projects")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .param("keyword", "%")
                        .param("status", "IN_PROGRESS"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Java 100% Basics"));

        mockMvc.perform(get("/api/projects")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .param("keyword", "JAVA")
                        .param("status", "IN_PROGRESS")
                        .param("sort", "startDateDesc")
                        .param("page", "0")
                        .param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].name").value("java_api"))
                .andExpect(jsonPath("$.page.totalElements").value(2))
                .andExpect(jsonPath("$.page.totalPages").value(2));
    }

    @Test
    void listSortsByProgressRateWithUncalculatedProjectsLast() throws Exception {
        Session session = signup("user@example.com");
        UUID fifty = insertProject(session.accountId(), "Half", null, "IN_PROGRESS", "2026-08-01", "2026-09-01", 3);
        UUID full = insertProject(session.accountId(), "Full", null, "IN_PROGRESS", "2026-08-01", "2026-09-01", 2);
        insertProject(session.accountId(), "Empty", null, "NOT_STARTED", "2026-08-01", "2026-09-01", 1);
        insertLeaf(fifty, "Half Task", BigDecimal.TEN, 50);
        insertLeaf(full, "Full Task", BigDecimal.TEN, 100);

        mockMvc.perform(get("/api/projects")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .param("sort", "progressRateDesc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].name").value("Full"))
                .andExpect(jsonPath("$.items[1].name").value("Half"))
                .andExpect(jsonPath("$.items[2].name").value("Empty"));

        mockMvc.perform(get("/api/projects")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .param("sort", "progressRateAsc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].name").value("Half"))
                .andExpect(jsonPath("$.items[1].name").value("Full"))
                .andExpect(jsonPath("$.items[2].name").value("Empty"));
    }

    @Test
    void otherAccountProjectReturnsNotFound() throws Exception {
        Session owner = signup("owner@example.com");
        Session other = signup("other@example.com");
        MvcResult created = createProject(owner, "Owner Project", null, "2026-08-01", "2026-09-01")
                .andExpect(status().isCreated())
                .andReturn();
        UUID projectId = projectId(created);

        mockMvc.perform(get("/api/projects/{projectId}", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PROJECT_NOT_FOUND"));

        mockMvc.perform(patch("/api/projects/{projectId}", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Other Update",
                                  "description": null,
                                  "startDate": "2026-08-01",
                                  "targetEndDate": "2026-09-01",
                                  "status": "IN_PROGRESS"
                                }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PROJECT_NOT_FOUND"));

        mockMvc.perform(delete("/api/projects/{projectId}", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PROJECT_NOT_FOUND"));
    }

    @Test
    void periodChangeCreatesHistoryAndCompletionRequiresAllLeafTasksDone() throws Exception {
        Session session = signup("user@example.com");
        MvcResult created = createProject(session, "Java", null, "2026-08-01", "2026-09-01")
                .andExpect(status().isCreated())
                .andReturn();
        UUID projectId = projectId(created);
        insertLeaf(projectId, "Incomplete", BigDecimal.TEN, 90);

        mockMvc.perform(patch("/api/projects/{projectId}", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Java",
                                  "description": null,
                                  "startDate": "2026-08-01",
                                  "targetEndDate": "2026-09-01",
                                  "status": "COMPLETED"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PROJECT_COMPLETION_NOT_ALLOWED"));

        jdbcTemplate.update("update wbs_tasks set progress_rate = 100 where project_id = ?", projectId);

        mockMvc.perform(patch("/api/projects/{projectId}", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Java",
                                  "description": null,
                                  "startDate": "2026-08-01",
                                  "targetEndDate": "2026-09-01",
                                  "status": "COMPLETED"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    void completionWithoutLeafTasksReturnsConflict() throws Exception {
        Session session = signup("user@example.com");
        MvcResult created = createProject(session, "Java", null, "2026-08-01", "2026-09-01")
                .andExpect(status().isCreated())
                .andReturn();
        UUID projectId = projectId(created);

        mockMvc.perform(patch("/api/projects/{projectId}", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Java",
                                  "description": null,
                                  "startDate": "2026-08-01",
                                  "targetEndDate": "2026-09-01",
                                  "status": "COMPLETED"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PROJECT_COMPLETION_NOT_ALLOWED"));
    }

    @Test
    void deleteProjectRemovesRelatedRowsIncludingParentAndLeafTasks() throws Exception {
        Session session = signup("user@example.com");
        MvcResult created = createProject(session, "Java", null, "2026-08-01", "2026-09-01")
                .andExpect(status().isCreated())
                .andReturn();
        UUID projectId = projectId(created);
        seedRelatedRows(session.accountId(), projectId);

        mockMvc.perform(delete("/api/projects/{projectId}", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk());

        assertThat(count("study_logs")).isZero();
        assertThat(count("wbs_task_plan_history")).isZero();
        assertThat(count("wbs_task_progress_history")).isZero();
        assertThat(count("wbs_tasks")).isZero();
        assertThat(count("project_period_history")).isZero();
        assertThat(count("projects")).isZero();
    }

    private ResultActions createProject(
            Session session,
            String name,
            String description,
            String startDate,
            String targetEndDate
    ) throws Exception {
        String descriptionJson = description == null ? "null" : "\"%s\"".formatted(description);
        return mockMvc.perform(post("/api/projects")
                .header(HttpHeaders.AUTHORIZATION, bearer(session))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "name": "%s",
                          "description": %s,
                          "startDate": "%s",
                          "targetEndDate": "%s"
                        }
                        """.formatted(name, descriptionJson, startDate, targetEndDate)));
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

    private UUID projectId(MvcResult result) throws Exception {
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).get("projectId").asText());
    }

    private String bearer(Session session) {
        return "Bearer " + session.accessToken();
    }

    private UUID insertProject(
            UUID accountId,
            String name,
            String description,
            String status,
            String startDate,
            String targetEndDate,
            int updatedDay
    ) {
        UUID projectId = UUID.randomUUID();
        Instant createdAt = Instant.parse("2026-07-01T00:00:00Z");
        Instant updatedAt = Instant.parse("2026-07-%02dT00:00:00Z".formatted(updatedDay));
        jdbcTemplate.update("""
                insert into projects (
                    id, account_id, name, description, start_date, target_end_date, status, created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                projectId,
                accountId,
                name,
                description,
                LocalDate.parse(startDate),
                LocalDate.parse(targetEndDate),
                status,
                Timestamp.from(createdAt),
                Timestamp.from(updatedAt)
        );
        return projectId;
    }

    private UUID insertLeaf(UUID projectId, String name, BigDecimal plannedHours, int progressRate) {
        UUID taskId = UUID.randomUUID();
        Instant now = Instant.parse("2026-07-01T00:00:00Z");
        jdbcTemplate.update("""
                insert into wbs_tasks (
                    id, project_id, parent_wbs_task_id, task_type, name, description,
                    planned_start_date, planned_end_date, planned_hours, progress_rate, created_at, updated_at
                ) values (?, ?, null, 'LEAF', ?, null, ?, ?, ?, ?, ?, ?)
                """,
                taskId,
                projectId,
                name,
                LocalDate.parse("2026-08-01"),
                LocalDate.parse("2026-09-01"),
                plannedHours,
                progressRate,
                Timestamp.from(now),
                Timestamp.from(now)
        );
        return taskId;
    }

    private void seedRelatedRows(UUID accountId, UUID projectId) {
        Instant now = Instant.parse("2026-07-01T00:00:00Z");
        UUID parentId = UUID.randomUUID();
        UUID leafId = UUID.randomUUID();
        jdbcTemplate.update("""
                insert into wbs_tasks (
                    id, project_id, parent_wbs_task_id, task_type, name, description,
                    planned_start_date, planned_end_date, planned_hours, progress_rate, created_at, updated_at
                ) values (?, ?, null, 'PARENT', 'Parent', null, null, null, null, null, ?, ?)
                """, parentId, projectId, Timestamp.from(now), Timestamp.from(now));
        jdbcTemplate.update("""
                insert into wbs_tasks (
                    id, project_id, parent_wbs_task_id, task_type, name, description,
                    planned_start_date, planned_end_date, planned_hours, progress_rate, created_at, updated_at
                ) values (?, ?, ?, 'LEAF', 'Leaf', null, ?, ?, ?, 50, ?, ?)
                """,
                leafId,
                projectId,
                parentId,
                LocalDate.parse("2026-08-01"),
                LocalDate.parse("2026-09-01"),
                new BigDecimal("10.00"),
                Timestamp.from(now),
                Timestamp.from(now)
        );
        jdbcTemplate.update("""
                insert into study_logs (
                    id, account_id, project_id, wbs_task_id, study_date, study_hours, memo, created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, 'memo', ?, ?)
                """,
                UUID.randomUUID(),
                accountId,
                projectId,
                leafId,
                LocalDate.parse("2026-08-02"),
                new BigDecimal("1.00"),
                Timestamp.from(now),
                Timestamp.from(now)
        );
        jdbcTemplate.update("""
                insert into wbs_task_progress_history (
                    id, wbs_task_id, project_id, task_name_snapshot, progress_rate, changed_by_account_id, changed_at
                ) values (?, ?, ?, 'Leaf', 50, ?, ?)
                """,
                UUID.randomUUID(),
                leafId,
                projectId,
                accountId,
                Timestamp.from(now)
        );
        jdbcTemplate.update("""
                insert into wbs_task_plan_history (
                    id, wbs_task_id, project_id, task_name_snapshot,
                    old_parent_wbs_task_id, new_parent_wbs_task_id,
                    old_planned_start_date, new_planned_start_date,
                    old_planned_end_date, new_planned_end_date,
                    old_planned_hours, new_planned_hours,
                    changed_by_account_id, changed_at
                ) values (?, ?, ?, 'Leaf', null, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                UUID.randomUUID(),
                leafId,
                projectId,
                parentId,
                LocalDate.parse("2026-08-01"),
                LocalDate.parse("2026-08-02"),
                LocalDate.parse("2026-09-01"),
                LocalDate.parse("2026-09-02"),
                new BigDecimal("8.00"),
                new BigDecimal("10.00"),
                accountId,
                Timestamp.from(now)
        );
        jdbcTemplate.update("""
                insert into project_period_history (
                    id, project_id, old_start_date, new_start_date, old_target_end_date,
                    new_target_end_date, changed_by_account_id, changed_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                UUID.randomUUID(),
                projectId,
                LocalDate.parse("2026-08-01"),
                LocalDate.parse("2026-08-02"),
                LocalDate.parse("2026-09-01"),
                LocalDate.parse("2026-09-02"),
                accountId,
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
