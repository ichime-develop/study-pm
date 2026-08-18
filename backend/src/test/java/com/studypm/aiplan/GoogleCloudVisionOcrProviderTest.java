package com.studypm.aiplan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.google.api.gax.rpc.StatusCode;
import com.google.cloud.vision.v1.AnnotateImageResponse;
import com.google.cloud.vision.v1.BatchAnnotateImagesResponse;
import com.google.cloud.vision.v1.Feature;
import com.google.cloud.vision.v1.Page;
import com.google.cloud.vision.v1.TextAnnotation;
import com.google.rpc.Code;
import com.google.rpc.Status;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

/**
 * Google Cloud Visionへ送る機能種別と応答の安全な分類を検証する。
 */
class GoogleCloudVisionOcrProviderTest {

    private final GoogleCloudVisionOcrProvider provider = new GoogleCloudVisionOcrProvider(
            "test-key",
            "vision.googleapis.com:443",
            java.time.Duration.ofSeconds(1),
            1,
            java.time.Duration.ofMillis(10)
    );

    @Test
    void buildsADocumentTextDetectionRequestWithOnlyImageBytes() {
        byte[] image = {1, 2, 3};

        var request = provider.requestFor(image);

        assertThat(request.getFeaturesList())
                .extracting(Feature::getType)
                .containsExactly(Feature.Type.DOCUMENT_TEXT_DETECTION);
        assertThat(request.getImage().getContent().toByteArray()).isEqualTo(image);
        assertThat(request.getImage().hasSource()).isFalse();
    }

    @Test
    void extractsFullTextAndPageCount() {
        TextAnnotation annotation = TextAnnotation.newBuilder()
                .setText("第1章 Javaの基本")
                .addPages(Page.newBuilder())
                .build();
        BatchAnnotateImagesResponse response = BatchAnnotateImagesResponse.newBuilder()
                .addResponses(AnnotateImageResponse.newBuilder().setFullTextAnnotation(annotation))
                .build();

        AiOcrProviderResult result = provider.resultFrom(response);

        assertThat(result.text()).isEqualTo("第1章 Javaの基本");
        assertThat(result.detectedPageCount()).isEqualTo(1);
    }

    @Test
    void classifiesPermissionErrorsAsUnavailableWithoutExposingTheResponse() {
        BatchAnnotateImagesResponse response = BatchAnnotateImagesResponse.newBuilder()
                .addResponses(AnnotateImageResponse.newBuilder().setError(Status.newBuilder()
                        .setCode(Code.PERMISSION_DENIED_VALUE)
                        .setMessage("secret provider detail")))
                .build();

        assertThatThrownBy(() -> provider.resultFrom(response))
                .isInstanceOfSatisfying(AiOcrProviderException.class, exception -> {
                    assertThat(exception.failureType()).isEqualTo(AiOcrProviderException.FailureType.UNAVAILABLE);
                    assertThat(exception.getMessage()).doesNotContain("secret provider detail");
                });
    }

    @Test
    void logsOnlyTheSafeFailureTypeAndProviderCode() {
        BatchAnnotateImagesResponse response = BatchAnnotateImagesResponse.newBuilder()
                .addResponses(AnnotateImageResponse.newBuilder().setError(Status.newBuilder()
                        .setCode(Code.PERMISSION_DENIED_VALUE)
                        .setMessage("secret provider detail")))
                .build();
        Logger logger = (Logger) LoggerFactory.getLogger(GoogleCloudVisionOcrProvider.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);

        try {
            assertThatThrownBy(() -> provider.resultFrom(response))
                    .isInstanceOf(AiOcrProviderException.class);
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }

        assertThat(appender.list).extracting(ILoggingEvent::getFormattedMessage)
                .allMatch(message -> !message.contains("secret provider detail"))
                .anyMatch(message -> message.contains("failureType=UNAVAILABLE")
                        && message.contains("providerCode=PERMISSION_DENIED"));
    }

    @Test
    void classifiesInvalidArgumentsAsInvalidImages() {
        AiOcrProviderException exception = provider.failureFor(StatusCode.Code.INVALID_ARGUMENT, null);

        assertThat(exception.failureType()).isEqualTo(AiOcrProviderException.FailureType.INVALID_IMAGE);
    }

    @Test
    void retriesOnlyTemporaryTransportFailures() throws Exception {
        var callSettings = provider.settingsForClient().batchAnnotateImagesSettings();

        assertThat(callSettings.getRetryableCodes())
                .contains(StatusCode.Code.DEADLINE_EXCEEDED, StatusCode.Code.INTERNAL, StatusCode.Code.UNAVAILABLE)
                .doesNotContain(StatusCode.Code.RESOURCE_EXHAUSTED, StatusCode.Code.PERMISSION_DENIED);
        assertThat(callSettings.getRetrySettings().getMaxAttempts()).isEqualTo(2);
    }
}
