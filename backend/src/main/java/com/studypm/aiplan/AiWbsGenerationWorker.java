package com.studypm.aiplan;

import java.time.Clock;
import java.time.Duration;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 待機中のWBS生成ジョブを1件ずつOpenAIへ送り、検証済み下書きへ確定する。
 */
@Component
@ConditionalOnProperty(prefix = "app.ai", name = "enabled", havingValue = "true")
public class AiWbsGenerationWorker {

    private static final Logger LOGGER = LoggerFactory.getLogger(AiWbsGenerationWorker.class);

    private final AiWbsGenerationJobTransactions transactions;
    private final AiWbsGenerationProvider provider;
    private final AiWbsDraftValidator validator;
    private final Clock clock;
    private final boolean isWorkerEnabled;
    private final int communicationRetries;
    private final Duration retryBackoff;

    public AiWbsGenerationWorker(
            AiWbsGenerationJobTransactions transactions,
            AiWbsGenerationProvider provider,
            AiWbsDraftValidator validator,
            Clock clock,
            @Value("${app.ai.worker.enabled:true}") boolean isWorkerEnabled,
            @Value("${app.ai.openai.communication-retries:2}") int communicationRetries,
            @Value("${app.ai.openai.retry-backoff:1s}") Duration retryBackoff
    ) {
        this.transactions = transactions;
        this.provider = provider;
        this.validator = validator;
        this.clock = clock;
        this.isWorkerEnabled = isWorkerEnabled;
        this.communicationRetries = Math.max(0, communicationRetries);
        this.retryBackoff = retryBackoff;
    }

    @Scheduled(fixedDelayString = "${app.ai.worker.poll-interval:2s}")
    public void poll() {
        if (!isWorkerEnabled) {
            return;
        }
        try {
            runNext();
        } catch (AiWbsGenerationWorkerException exception) {
            LOGGER.error(
                    "Unexpected failure while processing AI WBS generation job. jobId={}, failureType={}",
                    exception.jobId(),
                    exception.failureType()
            );
        } catch (RuntimeException exception) {
            LOGGER.error(
                    "Unexpected failure while polling an AI WBS generation job. failureType={}",
                    exception.getClass().getName()
            );
        }
    }

    public boolean runNext() {
        Optional<AiWbsGenerationWork> claimed = transactions.claimNext();
        if (claimed.isEmpty()) {
            return false;
        }
        AiWbsGenerationWork work = claimed.get();
        try {
            process(work);
        } catch (RuntimeException exception) {
            transactions.fail(work.jobId(), "AI_INTERNAL_ERROR");
            throw new AiWbsGenerationWorkerException(work.jobId(), exception);
        }
        return true;
    }

    private void process(AiWbsGenerationWork work) {
        String validationFeedback = null;
        for (int generation = 0; generation < 2; generation++) {
            AiWbsGenerationProviderResult providerResult;
            try {
                providerResult = callProviderWithRetry(work, validationFeedback);
            } catch (AiStructuredOutputException exception) {
                if (!prepareSchemaRegeneration(work, generation)) {
                    transactions.fail(work.jobId(), "AI_STRUCTURED_OUTPUT_INVALID");
                    return;
                }
                validationFeedback = safeFeedback(exception);
                continue;
            } catch (AiProviderException exception) {
                transactions.fail(work.jobId(), exception.errorCode());
                return;
            }
            try {
                AiValidatedWbsDraft validatedDraft = validator.validate(work.input(), providerResult.proposal());
                transactions.complete(work.jobId(), providerResult, validatedDraft);
                return;
            } catch (AiStructuredOutputException exception) {
                if (!prepareSchemaRegeneration(work, generation)) {
                    transactions.fail(work.jobId(), "AI_STRUCTURED_OUTPUT_INVALID");
                    return;
                }
                validationFeedback = safeFeedback(exception);
            } catch (AiDraftBusinessValidationException exception) {
                transactions.fail(work.jobId(), exception.errorCode());
                return;
            }
        }
        transactions.fail(work.jobId(), "AI_STRUCTURED_OUTPUT_INVALID");
    }

    private AiWbsGenerationProviderResult callProviderWithRetry(
            AiWbsGenerationWork work,
            String validationFeedback
    ) {
        AiProviderException lastFailure = null;
        for (int attempt = 0; attempt <= communicationRetries; attempt++) {
            if (!transactions.recordAttempt(work.jobId())) {
                throw new AiProviderException("The job is no longer active.", false);
            }
            try {
                return provider.generate(work, validationFeedback);
            } catch (AiStructuredOutputException exception) {
                throw exception;
            } catch (AiProviderException exception) {
                lastFailure = exception;
                if (!exception.isRetryable() || attempt == communicationRetries || !canRetryBeforeDeadline(work)) {
                    throw exception;
                }
                waitBeforeRetry();
            }
        }
        throw lastFailure == null
                ? new AiProviderException("OpenAI request failed.", false)
                : lastFailure;
    }

    private boolean prepareSchemaRegeneration(AiWbsGenerationWork work, int generation) {
        return generation == 0 && transactions.recordSchemaRegeneration(work.jobId());
    }

    private boolean canRetryBeforeDeadline(AiWbsGenerationWork work) {
        return clock.instant().plus(retryBackoff).isBefore(work.deadlineAt());
    }

    private void waitBeforeRetry() {
        try {
            Thread.sleep(retryBackoff);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new AiProviderException("OpenAI retry was interrupted.", false, exception);
        }
    }

    private String safeFeedback(AiStructuredOutputException exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            return "前回の出力がWBS下書きの構造要件を満たしませんでした。";
        }
        return message.length() <= 500 ? message : message.substring(0, 500);
    }
}
