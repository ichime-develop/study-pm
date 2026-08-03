package com.studypm.aiplan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.studypm.account.Account;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * WBS下書き生成ジョブの期限切れ解消と受付条件を検証する。
 */
class AiGenerationJobServiceTest {

    private final AiPlanGenerationRequestRepository requestRepository = mock(AiPlanGenerationRequestRepository.class);
    private final AiGenerationJobRepository jobRepository = mock(AiGenerationJobRepository.class);
    private final AiPlanDraftRepository draftRepository = mock(AiPlanDraftRepository.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-07-30T00:00:00Z"), ZoneOffset.UTC);

    private AiGenerationJobService service;
    private UUID accountId;
    private AiPlanGenerationRequest request;

    @BeforeEach
    void setUp() {
        service = new AiGenerationJobService(
                requestRepository,
                jobRepository,
                draftRepository,
                clock,
                Duration.ofMinutes(5),
                10,
                "test-model",
                "prompt-v1",
                "schema-v1",
                "strategy-v1"
        );
        Account account = Account.create("user@example.com", "encoded", "User", clock.instant());
        accountId = account.id();
        request = AiPlanGenerationRequest.create(
                account,
                new AiPlanRequestCommand(
                        AiPlanRequestSourceType.OVERVIEW,
                        "Javaを学ぶ",
                        LocalDate.parse("2026-08-01"),
                        LocalDate.parse("2026-08-31"),
                        JsonNodeFactory.instance.objectNode(),
                        List.of()
                ),
                clock.instant().plus(Duration.ofDays(30)),
                clock.instant()
        );
    }

    @Test
    void createExpiresExistingActiveJobBeforeQueuingNewJob() {
        AiGenerationJob expiredJob = AiGenerationJob.queue(
                request,
                clock.instant().minusSeconds(1),
                false,
                "test-model",
                "prompt-v1",
                "schema-v1",
                "strategy-v1",
                clock.instant().minus(Duration.ofMinutes(6))
        );
        when(requestRepository.findByIdAndAccount_Id(request.id(), accountId)).thenReturn(Optional.of(request));
        when(jobRepository.findAllByAccount_IdAndStatusIn(any(), any())).thenReturn(List.of(expiredJob));
        when(jobRepository.countByAccount_IdAndCreatedAtGreaterThanEqual(any(), any())).thenReturn(1L);
        when(jobRepository.saveAndFlush(any(AiGenerationJob.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AiGenerationJobResponse response = service.create(accountId, request.id(), true);

        assertThat(expiredJob.status()).isEqualTo(AiGenerationJobStatus.FAILED);
        assertThat(expiredJob.errorCode()).isEqualTo("AI_JOB_TIMEOUT");
        assertThat(response.jobType()).isEqualTo("WBS_GENERATION");
        assertThat(response.status()).isEqualTo(AiGenerationJobStatus.QUEUED);
        org.mockito.InOrder order = org.mockito.Mockito.inOrder(jobRepository);
        order.verify(jobRepository).findAllByAccount_IdAndStatusIn(any(), any());
        order.verify(jobRepository).flush();
        order.verify(jobRepository).countByAccount_IdAndCreatedAtGreaterThanEqual(any(), any());
    }

    @Test
    void createPreservesDeadlinePriorityForWorkerExecution() {
        when(requestRepository.findByIdAndAccount_Id(request.id(), accountId)).thenReturn(Optional.of(request));
        when(jobRepository.findAllByAccount_IdAndStatusIn(any(), any())).thenReturn(List.of());
        when(jobRepository.countByAccount_IdAndCreatedAtGreaterThanEqual(any(), any())).thenReturn(0L);
        when(jobRepository.saveAndFlush(any(AiGenerationJob.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AiGenerationJobResponse response = service.create(accountId, request.id(), true);

        ArgumentCaptor<AiGenerationJob> jobCaptor = ArgumentCaptor.forClass(AiGenerationJob.class);
        org.mockito.Mockito.verify(jobRepository).saveAndFlush(jobCaptor.capture());
        assertThat(response.status()).isEqualTo(AiGenerationJobStatus.QUEUED);
        assertThat(response.deadlineAt()).isEqualTo(clock.instant().plus(Duration.ofMinutes(5)));
        assertThat(jobCaptor.getValue().isDeadlinePriority()).isTrue();
    }
}
