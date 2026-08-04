package com.studypm.aiplan;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Set;

import com.google.api.gax.core.NoCredentialsProvider;
import com.google.api.gax.retrying.RetrySettings;
import com.google.api.gax.rpc.ApiException;
import com.google.api.gax.rpc.StatusCode;
import com.google.cloud.vision.v1.AnnotateImageRequest;
import com.google.cloud.vision.v1.AnnotateImageResponse;
import com.google.cloud.vision.v1.BatchAnnotateImagesResponse;
import com.google.cloud.vision.v1.Feature;
import com.google.cloud.vision.v1.Image;
import com.google.cloud.vision.v1.ImageAnnotatorClient;
import com.google.cloud.vision.v1.ImageAnnotatorSettings;
import com.google.protobuf.ByteString;
import com.google.rpc.Code;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Google Cloud Visionへ画像バイト列だけを送り、文書向けOCR結果を取得する。
 */
@Component
public class GoogleCloudVisionOcrProvider implements AiOcrProvider {

    private static final Logger LOGGER = LoggerFactory.getLogger(GoogleCloudVisionOcrProvider.class);
    private static final Set<StatusCode.Code> RETRYABLE_CODES = Set.of(
            StatusCode.Code.DEADLINE_EXCEEDED,
            StatusCode.Code.INTERNAL,
            StatusCode.Code.UNAVAILABLE
    );

    private final String apiKey;
    private final String endpoint;
    private final Duration requestTimeout;
    private final int communicationRetries;
    private final Duration retryBackoff;
    private volatile ImageAnnotatorClient client;

    public GoogleCloudVisionOcrProvider(
            @Value("${app.ai.vision.api-key:}") String apiKey,
            @Value("${app.ai.vision.endpoint:vision.googleapis.com:443}") String endpoint,
            @Value("${app.ai.vision.request-timeout:30s}") Duration requestTimeout,
            @Value("${app.ai.vision.communication-retries:1}") int communicationRetries,
            @Value("${app.ai.vision.retry-backoff:500ms}") Duration retryBackoff
    ) {
        if (endpoint.isBlank() || requestTimeout.isZero() || requestTimeout.isNegative()
                || communicationRetries < 0 || retryBackoff.isNegative()) {
            throw new IllegalArgumentException("Google Cloud Vision settings are invalid.");
        }
        this.apiKey = apiKey;
        this.endpoint = endpoint;
        this.requestTimeout = requestTimeout;
        this.communicationRetries = communicationRetries;
        this.retryBackoff = retryBackoff;
    }

    @Override
    public AiOcrProviderResult extractDocumentText(byte[] imageContent) {
        try {
            BatchAnnotateImagesResponse batchResponse = client().batchAnnotateImages(List.of(requestFor(imageContent)));
            return resultFrom(batchResponse);
        } catch (ApiException exception) {
            throw failureFor(exception.getStatusCode().getCode(), exception);
        } catch (AiOcrProviderException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw failure(
                    AiOcrProviderException.FailureType.PROVIDER_ERROR,
                    "UNEXPECTED_RUNTIME_ERROR",
                    "Google Cloud Vision request could not be completed.",
                    exception
            );
        }
    }

    AnnotateImageRequest requestFor(byte[] imageContent) {
        return AnnotateImageRequest.newBuilder()
                .setImage(Image.newBuilder().setContent(ByteString.copyFrom(imageContent)))
                .addFeatures(Feature.newBuilder().setType(Feature.Type.DOCUMENT_TEXT_DETECTION))
                .build();
    }

    AiOcrProviderResult resultFrom(BatchAnnotateImagesResponse batchResponse) {
        if (batchResponse.getResponsesCount() != 1) {
            throw failure(
                    AiOcrProviderException.FailureType.PROVIDER_ERROR,
                    "UNEXPECTED_RESPONSE_COUNT",
                    "Google Cloud Vision returned an unexpected response count."
            );
        }
        AnnotateImageResponse response = batchResponse.getResponses(0);
        if (response.hasError()) {
            throw failureFor(Code.forNumber(response.getError().getCode()), null);
        }
        if (!response.hasFullTextAnnotation()) {
            return new AiOcrProviderResult("", 1);
        }
        return new AiOcrProviderResult(
                response.getFullTextAnnotation().getText(),
                Math.max(1, response.getFullTextAnnotation().getPagesCount())
        );
    }

    AiOcrProviderException failureFor(StatusCode.Code code, Throwable cause) {
        if (code == StatusCode.Code.INVALID_ARGUMENT || code == StatusCode.Code.OUT_OF_RANGE) {
            return failure(
                    AiOcrProviderException.FailureType.INVALID_IMAGE,
                    code.name(),
                    "Google Cloud Vision rejected the image.",
                    cause
            );
        }
        if (code == StatusCode.Code.UNAUTHENTICATED
                || code == StatusCode.Code.PERMISSION_DENIED
                || code == StatusCode.Code.RESOURCE_EXHAUSTED) {
            return failure(
                    AiOcrProviderException.FailureType.UNAVAILABLE,
                    code.name(),
                    "Google Cloud Vision is unavailable for the configured project.",
                    cause
            );
        }
        return failure(
                AiOcrProviderException.FailureType.PROVIDER_ERROR,
                code.name(),
                "Google Cloud Vision request failed.",
                cause
        );
    }

    private AiOcrProviderException failureFor(Code code, Throwable cause) {
        if (code == null) {
            return failure(
                    AiOcrProviderException.FailureType.PROVIDER_ERROR,
                    "UNKNOWN",
                    "Google Cloud Vision returned an unknown error.",
                    cause
            );
        }
        try {
            return failureFor(StatusCode.Code.valueOf(code.name()), cause);
        } catch (IllegalArgumentException exception) {
            return failure(
                    AiOcrProviderException.FailureType.PROVIDER_ERROR,
                    "UNKNOWN",
                    "Google Cloud Vision returned an unknown error.",
                    cause
            );
        }
    }

    private ImageAnnotatorClient client() {
        ImageAnnotatorClient current = client;
        if (current != null) {
            return current;
        }
        synchronized (this) {
            if (client == null) {
                client = createClient();
            }
            return client;
        }
    }

    private ImageAnnotatorClient createClient() {
        try {
            return ImageAnnotatorClient.create(settingsForClient());
        } catch (IOException | RuntimeException exception) {
            throw failure(
                    AiOcrProviderException.FailureType.UNAVAILABLE,
                    "CLIENT_INITIALIZATION_FAILED",
                    "Google Cloud Vision client could not be initialized.",
                    exception
            );
        }
    }

    ImageAnnotatorSettings settingsForClient() throws IOException {
        int maxAttempts = communicationRetries + 1;
        ImageAnnotatorSettings.Builder settings = ImageAnnotatorSettings.newBuilder()
                .setApiKey(apiKey)
                .setCredentialsProvider(NoCredentialsProvider.create())
                .setEndpoint(endpoint);
        settings.batchAnnotateImagesSettings()
                .setRetryableCodes(RETRYABLE_CODES)
                .setRetrySettings(RetrySettings.newBuilder()
                        .setInitialRetryDelayDuration(retryBackoff)
                        .setRetryDelayMultiplier(1.0)
                        .setMaxRetryDelayDuration(retryBackoff)
                        .setInitialRpcTimeoutDuration(requestTimeout)
                        .setRpcTimeoutMultiplier(1.0)
                        .setMaxRpcTimeoutDuration(requestTimeout)
                        .setTotalTimeoutDuration(requestTimeout.multipliedBy(maxAttempts))
                        .setMaxAttempts(maxAttempts)
                        .build());
        return settings.build();
    }

    @PreDestroy
    void closeClient() {
        ImageAnnotatorClient current = client;
        if (current != null) {
            current.close();
        }
    }

    private AiOcrProviderException failure(
            AiOcrProviderException.FailureType failureType,
            String providerCode,
            String message
    ) {
        return failure(failureType, providerCode, message, null);
    }

    private AiOcrProviderException failure(
            AiOcrProviderException.FailureType failureType,
            String providerCode,
            String message,
            Throwable cause
    ) {
        if (failureType == AiOcrProviderException.FailureType.INVALID_IMAGE) {
            LOGGER.warn(
                    "Google Cloud Vision OCR rejected an image. failureType={}, providerCode={}",
                    failureType,
                    providerCode
            );
        } else {
            LOGGER.error(
                    "Google Cloud Vision OCR failed. failureType={}, providerCode={}",
                    failureType,
                    providerCode
            );
        }
        return new AiOcrProviderException(failureType, message, cause);
    }
}
