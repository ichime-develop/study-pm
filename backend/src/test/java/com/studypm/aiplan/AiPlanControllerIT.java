package com.studypm.aiplan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studypm.common.error.InvalidRequestException;
import com.studypm.wbs.WbsTaskService;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.mock.web.MockMultipartFile;
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

    @Autowired
    private AiWbsGenerationWorker generationWorker;

    @Autowired
    private AiWbsGenerationJobTransactions generationJobTransactions;

    @MockitoBean
    private AiWbsGenerationProvider generationProvider;

    @MockitoBean
    private AiOcrProvider ocrProvider;

    @MockitoSpyBean
    private WbsTaskService wbsTaskService;

    @DynamicPropertySource
    static void registerDatasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
        registry.add("app.security.jwt.secret", () -> "study-pm-ai-plan-integration-test-secret-key");
        registry.add("app.security.refresh-cookie.secure", () -> "false");
        registry.add("app.ai.enabled", () -> "true");
        registry.add("app.ai.worker.enabled", () -> "false");
        registry.add("app.ai.openai.api-key", () -> "test-openai-api-key");
        registry.add("app.ai.vision.api-key", () -> "test-vision-api-key");
    }

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.update("delete from wbs_task_progress_history");
        jdbcTemplate.update("delete from wbs_task_plan_history");
        jdbcTemplate.update("delete from wbs_tasks");
        jdbcTemplate.update("delete from project_period_history");
        jdbcTemplate.update("delete from projects");
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
    void extractsTextFromOneAuthenticatedImage() throws Exception {
        Session session = signup("ocr@example.com");
        org.mockito.Mockito.when(ocrProvider.extractDocumentText(any()))
                .thenReturn(new AiOcrProviderResult("第1章 Javaの基本", 1));
        MockMultipartFile image = new MockMultipartFile(
                "image",
                "toc.png",
                "image/png",
                new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00}
        );

        mockMvc.perform(multipart("/api/ai-plan/ocr")
                        .file(image)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("第1章 Javaの基本"))
                .andExpect(jsonPath("$.detectedPageCount").value(1));

        assertThat(jdbcTemplate.queryForObject("select count(*) from ai_plan_generation_requests", Integer.class))
                .isZero();
        assertThat(jdbcTemplate.queryForObject("select count(*) from ai_plan_sources", Integer.class)).isZero();
    }

    @Test
    void requiresAuthenticationForOcr() throws Exception {
        MockMultipartFile image = new MockMultipartFile(
                "image",
                "toc.png",
                "image/png",
                new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00}
        );

        mockMvc.perform(multipart("/api/ai-plan/ocr").file(image))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsAnOcrRequestWithoutAnImage() throws Exception {
        Session session = signup("ocr-missing@example.com");

        mockMvc.perform(multipart("/api/ai-plan/ocr")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("AI_OCR_INVALID_IMAGE"));
    }

    @Test
    void rejectsAnOcrImageLargerThanTenMegabytesWithTheStableCode() throws Exception {
        Session session = signup("ocr-large@example.com");
        byte[] content = new byte[10 * 1024 * 1024 + 1];
        byte[] signature = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};
        System.arraycopy(signature, 0, content, 0, signature.length);
        MockMultipartFile image = new MockMultipartFile("image", "large.png", "image/png", content);

        mockMvc.perform(multipart("/api/ai-plan/ocr")
                        .file(image)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("AI_INPUT_LIMIT_EXCEEDED"));
    }

    @Test
    void hidesOcrProviderFailuresBehindTheStableApiError() throws Exception {
        Session session = signup("ocr-provider-error@example.com");
        org.mockito.Mockito.when(ocrProvider.extractDocumentText(any())).thenThrow(new AiOcrProviderException(
                AiOcrProviderException.FailureType.PROVIDER_ERROR,
                "secret provider response"
        ));
        MockMultipartFile image = new MockMultipartFile(
                "image",
                "toc.png",
                "image/png",
                new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00}
        );

        mockMvc.perform(multipart("/api/ai-plan/ocr")
                        .file(image)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("AI_PROVIDER_ERROR"))
                .andExpect(jsonPath("$.message").value(
                        "画像の文字読み取りに失敗しました。時間をおいて再試行してください。"
                ));
    }

    @Test
    void rejectsRequestUpdatesWhileItsGenerationJobIsActive() throws Exception {
        Session session = signup("request-active@example.com");
        UUID requestId = createRequest(session, "content");
        insertProcessingJob(session.accountId(), requestId, Instant.now().plusSeconds(300));

        mockMvc.perform(put("/api/ai-plan/requests/{requestId}", requestId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestPayload("changed")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("AI_JOB_ALREADY_ACTIVE"));
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

    @Test
    void hidesDraftResourcesOwnedByAnotherAccount() throws Exception {
        Session owner = signup("draft-owner@example.com");
        UUID draftId = generateDraft(owner);
        Session other = signup("draft-other@example.com");

        mockMvc.perform(get("/api/ai-plan/drafts/{draftId}", draftId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("AI_PLAN_NOT_FOUND"));
        mockMvc.perform(put("/api/ai-plan/drafts/{draftId}", draftId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftPayload(1, "不正な更新", "1.0")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("AI_PLAN_NOT_FOUND"));
        mockMvc.perform(post("/api/ai-plan/drafts/{draftId}/convert", draftId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"draftRevision\": 1 }"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("AI_PLAN_NOT_FOUND"));

        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from ai_plan_drafts where id = ? and converted_at is null", Integer.class, draftId
        )).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("select count(*) from projects", Integer.class)).isZero();
    }

    @Test
    void generatesAndReturnsAValidatedDraftWithoutCallingTheLiveProvider() throws Exception {
        Session session = signup("draft@example.com");
        UUID requestId = createRequest(session, "Javaの基本を学ぶ");
        AiWbsDraftProposal proposal = new AiWbsDraftProposal(
                new AiWbsDraftProject(
                        "Java学習", "", LocalDate.parse("2026-08-01"), LocalDate.parse("2026-09-01")
                ),
                List.of(
                        new AiWbsDraftTask(
                                "parent-1", AiDraftTaskType.PARENT, null, "基礎", "",
                                null, null, null, List.of()
                        ),
                        new AiWbsDraftTask(
                                "leaf-1", AiDraftTaskType.LEAF, "parent-1", "Javaの基本を読む", "",
                                LocalDate.parse("2026-08-01"), LocalDate.parse("2026-08-02"),
                                BigDecimal.ONE, List.of("source-1")
                        )
                ),
                WbsSplitUnit.SECTION
        );
        org.mockito.Mockito.when(generationProvider.generate(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.isNull()))
                .thenReturn(new AiWbsGenerationProviderResult(proposal, "resp_integration", 120, 80));
        MvcResult createdJob = mockMvc.perform(post("/api/ai-plan/requests/{requestId}/draft-jobs", requestId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"deadlinePriority\": false }"))
                .andExpect(status().isAccepted())
                .andReturn();
        UUID jobId = UUID.fromString(objectMapper.readTree(createdJob.getResponse().getContentAsString()).get("jobId").asText());

        assertThat(generationWorker.runNext()).isTrue();

        MvcResult completedJob = mockMvc.perform(get("/api/ai-plan/jobs/{jobId}", jobId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.draftId").isNotEmpty())
                .andReturn();
        UUID draftId = UUID.fromString(objectMapper.readTree(completedJob.getResponse().getContentAsString())
                .get("draftId").asText());
        mockMvc.perform(get("/api/ai-plan/drafts/{draftId}", draftId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draftRevision").value(1))
                .andExpect(jsonPath("$.project.name").value("Java学習"))
                .andExpect(jsonPath("$.tasks[1].temporaryKey").value("leaf-1"))
                .andExpect(jsonPath("$.validation.status").value("VALID"))
                .andExpect(jsonPath("$.validation.issues").doesNotExist());

        assertThat(jdbcTemplate.queryForObject(
                "select provider_request_id from ai_generation_jobs where id = ?", String.class, jobId
        )).isEqualTo("resp_integration");
    }

    @Test
    void discardsACompletedProviderResultAfterCancellationWasRequested() throws Exception {
        Session session = signup("cancel-complete@example.com");
        UUID requestId = createRequest(session, "content");
        UUID jobId = insertProcessingJob(session.accountId(), requestId, Instant.now().plusSeconds(300));

        mockMvc.perform(post("/api/ai-plan/jobs/{jobId}/cancel", jobId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCEL_REQUESTED"));

        AiWbsGenerationProviderResult providerResult = validProviderResult();
        generationJobTransactions.complete(jobId, providerResult, validDraft(providerResult.proposal()));

        assertThat(jdbcTemplate.queryForObject(
                "select status from ai_generation_jobs where id = ?", String.class, jobId
        )).isEqualTo("CANCELED");
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from ai_plan_drafts where ai_generation_job_id = ?", Integer.class, jobId
        )).isZero();
    }

    @Test
    void stopsBeforeAnotherProviderAttemptAfterCancellationWasRequested() throws Exception {
        Session session = signup("cancel-attempt@example.com");
        UUID requestId = createRequest(session, "content");
        UUID jobId = insertProcessingJob(session.accountId(), requestId, Instant.now().plusSeconds(300));

        mockMvc.perform(post("/api/ai-plan/jobs/{jobId}/cancel", jobId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCEL_REQUESTED"));

        assertThat(generationJobTransactions.recordAttempt(jobId)).isFalse();
        assertThat(jdbcTemplate.queryForObject(
                "select status from ai_generation_jobs where id = ?", String.class, jobId
        )).isEqualTo("CANCELED");
    }

    @Test
    void rejectsAProviderResultCompletedAfterTheJobDeadline() throws Exception {
        Session session = signup("deadline-complete@example.com");
        UUID requestId = createRequest(session, "content");
        UUID jobId = insertProcessingJob(session.accountId(), requestId, Instant.now().minusSeconds(1));
        AiWbsGenerationProviderResult providerResult = validProviderResult();

        generationJobTransactions.complete(jobId, providerResult, validDraft(providerResult.proposal()));

        assertThat(jdbcTemplate.queryForObject(
                "select status from ai_generation_jobs where id = ?", String.class, jobId
        )).isEqualTo("FAILED");
        assertThat(jdbcTemplate.queryForObject(
                "select error_code from ai_generation_jobs where id = ?", String.class, jobId
        )).isEqualTo("AI_JOB_TIMEOUT");
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from ai_plan_drafts where ai_generation_job_id = ?", Integer.class, jobId
        )).isZero();
    }

    @Test
    void completingTheSameJobTwiceKeepsOnlyOneDraft() throws Exception {
        Session session = signup("complete-twice@example.com");
        UUID requestId = createRequest(session, "content");
        UUID jobId = insertProcessingJob(session.accountId(), requestId, Instant.now().plusSeconds(300));
        AiWbsGenerationProviderResult providerResult = validProviderResult();
        AiValidatedWbsDraft draft = validDraft(providerResult.proposal());

        generationJobTransactions.complete(jobId, providerResult, draft);
        generationJobTransactions.complete(jobId, providerResult, draft);

        assertThat(jdbcTemplate.queryForObject(
                "select status from ai_generation_jobs where id = ?", String.class, jobId
        )).isEqualTo("COMPLETED");
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from ai_plan_drafts where ai_generation_job_id = ?", Integer.class, jobId
        )).isEqualTo(1);
    }

    @Test
    void updatesAndConvertsADraftIntoAnOrdinaryProjectAndWbs() throws Exception {
        Session session = signup("draft-convert@example.com");
        UUID draftId = generateDraft(session);

        mockMvc.perform(put("/api/ai-plan/drafts/{draftId}", draftId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftPayload(1, "Java学習を更新", "2.0")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draftRevision").value(2))
                .andExpect(jsonPath("$.project.name").value("Java学習を更新"))
                .andExpect(jsonPath("$.tasks[1].plannedHours").value(2.0));

        MvcResult converted = mockMvc.perform(post("/api/ai-plan/drafts/{draftId}/convert", draftId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"draftRevision\": 2 }"))
                .andExpect(status().isCreated())
                .andReturn();
        UUID projectId = UUID.fromString(objectMapper.readTree(converted.getResponse().getContentAsString()).get("projectId").asText());
        assertThat(objectMapper.readTree(converted.getResponse().getContentAsString()).get("wbsTaskIds")).hasSize(2);

        mockMvc.perform(get("/api/projects/{projectId}/wbs", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks.length()").value(2))
                .andExpect(jsonPath("$.tasks[0].taskType").value("PARENT"))
                .andExpect(jsonPath("$.tasks[1].taskType").value("LEAF"))
                .andExpect(jsonPath("$.tasks[1].name").value("Javaの基本を読む"))
                .andExpect(jsonPath("$.tasks[1].plannedHours").value(2.0))
                .andExpect(jsonPath("$.tasks[1].progressRate").value(0));
        mockMvc.perform(get("/api/projects/{projectId}/overview", projectId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plannedHours").value(2.0))
                .andExpect(jsonPath("$.progressRate").value(0));
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from wbs_task_progress_history where project_id = ?", Integer.class, projectId
        )).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from ai_plan_drafts where id = ? and converted_at is not null", Integer.class, draftId
        )).isEqualTo(1);

        mockMvc.perform(post("/api/ai-plan/drafts/{draftId}/convert", draftId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"draftRevision\": 1 }"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("AI_PLAN_ALREADY_CONVERTED"));
    }

    @Test
    void rejectsStaleRevisionForDraftUpdateAndConversion() throws Exception {
        Session session = signup("draft-stale@example.com");
        UUID draftId = generateDraft(session);

        mockMvc.perform(put("/api/ai-plan/drafts/{draftId}", draftId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftPayload(1, "Java学習を更新", "2.0")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draftRevision").value(2));

        mockMvc.perform(put("/api/ai-plan/drafts/{draftId}", draftId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftPayload(1, "古い画面からの更新", "1.0")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("STALE_AI_PLAN_REVISION"));
        mockMvc.perform(post("/api/ai-plan/drafts/{draftId}/convert", draftId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"draftRevision\": 1 }"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("STALE_AI_PLAN_REVISION"));

        assertThat(jdbcTemplate.queryForObject("select count(*) from projects", Integer.class)).isZero();
    }

    @Test
    void doesNotCreateProjectWhenDraftRevalidationFails() throws Exception {
        Session session = signup("draft-invalid@example.com");
        UUID draftId = generateDraft(session);
        jdbcTemplate.update("""
                update ai_plan_drafts
                set draft_wbs_tasks_json = jsonb_set(draft_wbs_tasks_json, '{1,plannedHours}', '0.3'::jsonb)
                where id = ?
                """, draftId);

        mockMvc.perform(post("/api/ai-plan/drafts/{draftId}/convert", draftId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"draftRevision\": 1 }"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("AI_DRAFT_VALIDATION_FAILED"));

        assertThat(jdbcTemplate.queryForObject("select count(*) from projects", Integer.class)).isZero();
        assertThat(jdbcTemplate.queryForObject("select count(*) from wbs_tasks", Integer.class)).isZero();
    }

    @Test
    void rollsBackProjectAndParentWhenLeafCreationFails() throws Exception {
        Session session = signup("draft-rollback@example.com");
        UUID draftId = generateDraft(session);
        doThrow(new InvalidRequestException("TEST_WBS_FAILURE", "LEAF作成失敗"))
                .when(wbsTaskService)
                .create(any(), any(), argThat(command -> "LEAF".equals(command.taskType())));

        mockMvc.perform(post("/api/ai-plan/drafts/{draftId}/convert", draftId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"draftRevision\": 1 }"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("TEST_WBS_FAILURE"));

        assertThat(jdbcTemplate.queryForObject("select count(*) from projects", Integer.class)).isZero();
        assertThat(jdbcTemplate.queryForObject("select count(*) from wbs_tasks", Integer.class)).isZero();
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from ai_plan_drafts where id = ? and converted_at is null", Integer.class, draftId
        )).isEqualTo(1);
    }

    @Test
    void rejectsAnOldDraftAfterItsGenerationInputChanged() throws Exception {
        Session session = signup("draft-regenerate@example.com");
        UUID requestId = createRequest(session, "content");
        UUID draftId = generateDraft(session, requestId);

        mockMvc.perform(put("/api/ai-plan/requests/{requestId}", requestId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestPayload("changed content")))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/ai-plan/drafts/{draftId}", draftId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftPayload(1, "Java学習", "1.0")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("AI_DRAFT_REGENERATION_REQUIRED"));
        mockMvc.perform(post("/api/ai-plan/drafts/{draftId}/convert", draftId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"draftRevision\": 1 }"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("AI_DRAFT_REGENERATION_REQUIRED"));
    }

    @Test
    void keepsTheDailyLimitErrorCodeWhenUpdatingADraft() throws Exception {
        Session session = signup("draft-hours@example.com");
        UUID draftId = generateDraft(session);

        mockMvc.perform(put("/api/ai-plan/drafts/{draftId}", draftId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftPayload(1, "Java学習", "50.0")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("AI_DRAFT_DAILY_LIMIT_EXCEEDED"));
    }

    private AiWbsGenerationProviderResult validProviderResult() {
        AiWbsDraftProposal proposal = new AiWbsDraftProposal(
                new AiWbsDraftProject(
                        "Java学習", "", LocalDate.parse("2026-08-01"), LocalDate.parse("2026-09-01")
                ),
                List.of(
                        new AiWbsDraftTask(
                                "parent-1", AiDraftTaskType.PARENT, null, "基礎", "",
                                null, null, null, List.of()
                        ),
                        new AiWbsDraftTask(
                                "leaf-1", AiDraftTaskType.LEAF, "parent-1", "Javaの基本を読む", "",
                                LocalDate.parse("2026-08-01"), LocalDate.parse("2026-08-02"),
                                BigDecimal.ONE, List.of("source-1")
                        )
                ),
                WbsSplitUnit.SECTION
        );
        return new AiWbsGenerationProviderResult(proposal, "resp_race", 100, 50);
    }

    private AiValidatedWbsDraft validDraft(AiWbsDraftProposal proposal) {
        return new AiValidatedWbsDraft(
                proposal,
                objectMapper.valueToTree(proposal.tasks()),
                AiPlanDraftValidationStatus.VALID,
                objectMapper.createArrayNode(),
                objectMapper.createArrayNode()
        );
    }

    private UUID generateDraft(Session session) throws Exception {
        return generateDraft(session, createRequest(session, "Javaの基本を学ぶ"));
    }

    private UUID generateDraft(Session session, UUID requestId) throws Exception {
        AiWbsDraftProposal proposal = validProviderResult().proposal();
        org.mockito.Mockito.when(generationProvider.generate(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.isNull()))
                .thenReturn(new AiWbsGenerationProviderResult(proposal, "resp_draft", 120, 80));
        MvcResult createdJob = mockMvc.perform(post("/api/ai-plan/requests/{requestId}/draft-jobs", requestId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"deadlinePriority\": false }"))
                .andExpect(status().isAccepted())
                .andReturn();
        assertThat(generationWorker.runNext()).isTrue();
        UUID jobId = UUID.fromString(objectMapper.readTree(createdJob.getResponse().getContentAsString()).get("jobId").asText());
        return jdbcTemplate.queryForObject(
                "select id from ai_plan_drafts where ai_generation_job_id = ?", UUID.class, jobId
        );
    }

    private String draftPayload(int revision, String projectName, String plannedHours) {
        return """
                {
                  "draftRevision": %d,
                  "project": {
                    "name": "%s",
                    "description": "",
                    "startDate": "2026-08-01",
                    "targetEndDate": "2026-09-01"
                  },
                  "tasks": [
                    {
                      "temporaryKey": "parent-1",
                      "taskType": "PARENT",
                      "parentTemporaryKey": null,
                      "name": "基礎",
                      "description": "",
                      "plannedStartDate": null,
                      "plannedEndDate": null,
                      "plannedHours": null,
                      "sourceTemporaryKeys": []
                    },
                    {
                      "temporaryKey": "leaf-1",
                      "taskType": "LEAF",
                      "parentTemporaryKey": "parent-1",
                      "name": "Javaの基本を読む",
                      "description": "",
                      "plannedStartDate": "2026-08-01",
                      "plannedEndDate": "2026-08-02",
                      "plannedHours": %s,
                      "sourceTemporaryKeys": ["source-1"]
                    }
                  ]
                }
                """.formatted(revision, projectName, plannedHours);
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
