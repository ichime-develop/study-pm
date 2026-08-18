package com.studypm.aiplan;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.slf4j.LoggerFactory;

/**
 * WBS生成workerの成功、再生成、通信再試行を検証する。
 */
class AiWbsGenerationWorkerTest {

    private final AiWbsGenerationJobTransactions transactions = mock(AiWbsGenerationJobTransactions.class);
    private final AiWbsGenerationProvider provider = mock(AiWbsGenerationProvider.class);
    private final AiWbsDraftValidator validator = mock(AiWbsDraftValidator.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-07-30T00:00:00Z"), ZoneOffset.UTC);

    @Test
    void savesAValidatedDraftAndCompletesTheJob() {
        AiWbsGenerationWork work = work();
        AiWbsGenerationProviderResult providerResult = providerResult("Java学習");
        AiValidatedWbsDraft validated = validated(providerResult.proposal());
        when(transactions.claimNext()).thenReturn(Optional.of(work));
        when(transactions.recordAttempt(work.jobId())).thenReturn(true);
        when(provider.generate(work, null)).thenReturn(providerResult);
        when(validator.validate(work.input(), providerResult.proposal())).thenReturn(validated);

        worker(0).runNext();

        org.mockito.Mockito.verify(transactions).complete(work.jobId(), providerResult, validated);
    }

    @Test
    void regeneratesOnceAfterAStructuralValidationFailure() {
        AiWbsGenerationWork work = work();
        AiWbsGenerationProviderResult first = providerResult("初回案");
        AiWbsGenerationProviderResult second = providerResult("再生成案");
        AiValidatedWbsDraft validated = validated(second.proposal());
        when(transactions.claimNext()).thenReturn(Optional.of(work));
        when(transactions.recordAttempt(work.jobId())).thenReturn(true);
        when(transactions.recordSchemaRegeneration(work.jobId())).thenReturn(true);
        when(provider.generate(eq(work), isNull())).thenReturn(first);
        when(validator.validate(work.input(), first.proposal()))
                .thenThrow(new AiStructuredOutputException(
                        "PARENT_SOURCE_KEYS_NOT_EMPTY",
                        "PARENTのsourceTemporaryKeysは空配列にしてください。"
                ));
        when(provider.generate(eq(work), eq(
                "元の入力条件と学習範囲を省略せず、指摘された構造上の問題だけを修正して、"
                        + "WBS全体を再生成してください。 構造上の問題: "
                        + "PARENTのsourceTemporaryKeysは空配列にしてください。"
        )))
                .thenReturn(second);
        when(validator.validate(work.input(), second.proposal())).thenReturn(validated);

        worker(0).runNext();

        InOrder order = inOrder(provider, transactions);
        order.verify(provider).generate(work, null);
        order.verify(transactions).recordSchemaRegeneration(work.jobId());
        order.verify(provider).generate(
                work,
                "元の入力条件と学習範囲を省略せず、指摘された構造上の問題だけを修正して、"
                        + "WBS全体を再生成してください。 構造上の問題: "
                        + "PARENTのsourceTemporaryKeysは空配列にしてください。"
        );
        order.verify(transactions).complete(work.jobId(), second, validated);
    }

    @Test
    void retriesATransientProviderFailureWithoutCreatingANewJob() {
        AiWbsGenerationWork work = work();
        AiWbsGenerationProviderResult result = providerResult("Java学習");
        AiValidatedWbsDraft validated = validated(result.proposal());
        when(transactions.claimNext()).thenReturn(Optional.of(work));
        when(transactions.recordAttempt(work.jobId())).thenReturn(true);
        when(provider.generate(work, null))
                .thenThrow(new AiProviderException("temporary", true))
                .thenReturn(result);
        when(validator.validate(work.input(), result.proposal())).thenReturn(validated);

        worker(1).runNext();

        org.mockito.Mockito.verify(provider, org.mockito.Mockito.times(2)).generate(work, null);
        org.mockito.Mockito.verify(transactions, org.mockito.Mockito.times(2)).recordAttempt(work.jobId());
        org.mockito.Mockito.verify(transactions).complete(work.jobId(), result, validated);
    }

    @Test
    void preservesTheProviderErrorCodeForAnOversizedOutput() {
        AiWbsGenerationWork work = work();
        when(transactions.claimNext()).thenReturn(Optional.of(work));
        when(transactions.recordAttempt(work.jobId())).thenReturn(true);
        when(provider.generate(work, null)).thenThrow(new AiProviderException(
                "AI_OUTPUT_TOO_LARGE",
                "output limit",
                false
        ));

        worker(0).runNext();

        org.mockito.Mockito.verify(transactions).fail(work.jobId(), "AI_OUTPUT_TOO_LARGE");
        org.mockito.Mockito.verify(provider).generate(work, null);
    }

    @Test
    void doesNotRetryANonRetryableProviderFailure() {
        AiWbsGenerationWork work = work();
        when(transactions.claimNext()).thenReturn(Optional.of(work));
        when(transactions.recordAttempt(work.jobId())).thenReturn(true);
        when(provider.generate(work, null)).thenThrow(new AiProviderException("bad request", false));

        worker(2).runNext();

        org.mockito.Mockito.verify(provider).generate(work, null);
        org.mockito.Mockito.verify(transactions).recordAttempt(work.jobId());
        org.mockito.Mockito.verify(transactions).fail(work.jobId(), "AI_PROVIDER_ERROR");
    }

    @Test
    void doesNotRetryWhenAiGenerationIsUnavailable() {
        AiWbsGenerationWork work = work();
        when(transactions.claimNext()).thenReturn(Optional.of(work));
        when(transactions.recordAttempt(work.jobId())).thenReturn(true);
        when(provider.generate(work, null)).thenThrow(new AiProviderException(
                "AI_GENERATION_UNAVAILABLE",
                "unavailable",
                false
        ));

        worker(2).runNext();

        org.mockito.Mockito.verify(provider).generate(work, null);
        org.mockito.Mockito.verify(transactions).recordAttempt(work.jobId());
        org.mockito.Mockito.verify(transactions).fail(work.jobId(), "AI_GENERATION_UNAVAILABLE");
    }

    @Test
    void classifiesAnUnexpectedFailureAsInternalWithoutCopyingItsMessage() {
        AiWbsGenerationWork work = work();
        AiWbsGenerationProviderResult result = providerResult("Java学習");
        when(transactions.claimNext()).thenReturn(Optional.of(work));
        when(transactions.recordAttempt(work.jobId())).thenReturn(true);
        when(provider.generate(work, null)).thenReturn(result);
        when(validator.validate(work.input(), result.proposal()))
                .thenThrow(new IllegalStateException("sensitive provider response"));

        assertThatThrownBy(() -> worker(0).runNext())
                .isInstanceOf(AiWbsGenerationWorkerException.class)
                .hasMessage("AI WBS generation worker failed.")
                .hasMessageNotContaining("sensitive provider response");
        org.mockito.Mockito.verify(transactions).fail(work.jobId(), "AI_INTERNAL_ERROR");
    }

    @Test
    void pollingLogDoesNotContainTheFailureMessage() {
        AiWbsGenerationWork work = work();
        AiWbsGenerationProviderResult result = providerResult("Java学習");
        when(transactions.claimNext()).thenReturn(Optional.of(work));
        when(transactions.recordAttempt(work.jobId())).thenReturn(true);
        when(provider.generate(work, null)).thenReturn(result);
        when(validator.validate(work.input(), result.proposal()))
                .thenThrow(new IllegalStateException("sensitive provider response"));
        Logger logger = (Logger) LoggerFactory.getLogger(AiWbsGenerationWorker.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);

        try {
            worker(0).poll();
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }

        assertThat(appender.list).extracting(ILoggingEvent::getFormattedMessage)
                .allMatch(message -> !message.contains("sensitive provider response"))
                .anyMatch(message -> message.contains(work.jobId().toString())
                        && message.contains(IllegalStateException.class.getName()));
    }

    @Test
    void logsTheStructuredFailureReasonWithoutTheValidationMessage() {
        AiWbsGenerationWork work = work();
        AiWbsGenerationProviderResult first = providerResult("初回案");
        AiWbsGenerationProviderResult second = providerResult("再生成案");
        when(transactions.claimNext()).thenReturn(Optional.of(work));
        when(transactions.recordAttempt(work.jobId())).thenReturn(true);
        when(transactions.recordSchemaRegeneration(work.jobId())).thenReturn(true);
        when(provider.generate(work, null)).thenReturn(first);
        when(provider.generate(
                work,
                "元の入力条件と学習範囲を省略せず、指摘された構造上の問題だけを修正して、"
                        + "WBS全体を再生成してください。 構造上の問題: sensitive validation detail"
        )).thenReturn(second);
        when(validator.validate(work.input(), first.proposal()))
                .thenThrow(new AiStructuredOutputException(
                        "LEAF_PARENT_REFERENCE_INVALID",
                        "sensitive validation detail"
                ));
        when(validator.validate(work.input(), second.proposal()))
                .thenThrow(new AiStructuredOutputException(
                        "LEAF_PARENT_REFERENCE_INVALID",
                        "sensitive validation detail"
                ));
        Logger logger = (Logger) LoggerFactory.getLogger(AiWbsGenerationWorker.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);

        try {
            worker(0).runNext();
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }

        assertThat(appender.list).extracting(ILoggingEvent::getFormattedMessage)
                .allMatch(message -> !message.contains("sensitive validation detail"))
                .anyMatch(message -> message.contains(work.jobId().toString())
                        && message.contains("generation=2")
                        && message.contains("stage=VALIDATOR")
                        && message.contains("reason=LEAF_PARENT_REFERENCE_INVALID"));
        org.mockito.Mockito.verify(transactions).fail(work.jobId(), "AI_STRUCTURED_OUTPUT_INVALID");
    }

    private AiWbsGenerationWorker worker(int retries) {
        return new AiWbsGenerationWorker(
                transactions, provider, validator, clock, true, retries, Duration.ZERO
        );
    }

    private AiWbsGenerationWork work() {
        AiWbsGenerationInput input = new AiWbsGenerationInput(
                AiPlanRequestSourceType.OVERVIEW,
                "Javaを学ぶ",
                LocalDate.parse("2026-08-01"),
                LocalDate.parse("2026-08-31"),
                JsonNodeFactory.instance.objectNode(),
                null,
                List.of()
        );
        return new AiWbsGenerationWork(
                UUID.randomUUID(), "test-model", "v1", "v1", "v1",
                clock.instant().plusSeconds(300), false, input
        );
    }

    private AiWbsGenerationProviderResult providerResult(String projectName) {
        AiWbsDraftProposal proposal = new AiWbsDraftProposal(
                new AiWbsDraftProject(
                        projectName, "", LocalDate.parse("2026-08-01"), LocalDate.parse("2026-08-31")
                ),
                List.of(),
                WbsSplitUnit.SECTION
        );
        return new AiWbsGenerationProviderResult(proposal, "resp_test", 100, 50);
    }

    private AiValidatedWbsDraft validated(AiWbsDraftProposal proposal) {
        ObjectMapper objectMapper = new ObjectMapper();
        return new AiValidatedWbsDraft(
                proposal,
                objectMapper.createArrayNode(),
                AiPlanDraftValidationStatus.VALID,
                objectMapper.createArrayNode(),
                objectMapper.createArrayNode()
        );
    }
}
