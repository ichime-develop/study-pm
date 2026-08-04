package com.studypm.aiplan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.studypm.common.error.BadGatewayException;
import com.studypm.common.error.InvalidRequestException;
import com.studypm.common.error.ServiceUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

/**
 * OCR画像の入力制約と外部サービス失敗のAPI向け分類を検証する。
 */
class AiOcrServiceTest {

    private final AiOcrProvider ocrProvider = mock(AiOcrProvider.class);
    private final AiOcrService service = new AiOcrService(ocrProvider);

    @Test
    void extractsTextFromASupportedImageWithoutPersistingIt() {
        when(ocrProvider.extractDocumentText(any())).thenReturn(new AiOcrProviderResult("第1章 Java", 1));

        AiOcrResponse response = service.extract(image("image/png", pngBytes()));

        assertThat(response.text()).isEqualTo("第1章 Java");
        assertThat(response.detectedPageCount()).isEqualTo(1);
    }

    @Test
    void acceptsJpegImageBytes() {
        when(ocrProvider.extractDocumentText(any())).thenReturn(new AiOcrProviderResult("JPEG目次", 1));

        AiOcrResponse response = service.extract(image("image/jpeg", jpegBytes()));

        assertThat(response.text()).isEqualTo("JPEG目次");
    }

    @Test
    void acceptsWebpImageBytes() {
        when(ocrProvider.extractDocumentText(any())).thenReturn(new AiOcrProviderResult("WEBP目次", 1));

        AiOcrResponse response = service.extract(image("image/webp", webpBytes()));

        assertThat(response.text()).isEqualTo("WEBP目次");
    }

    @Test
    void rejectsAFileWhoseDeclaredTypeDoesNotMatchSupportedImageBytes() {
        assertThatThrownBy(() -> service.extract(image("image/png", "not-an-image".getBytes())))
                .isInstanceOfSatisfying(InvalidRequestException.class, exception ->
                        assertThat(exception.code()).isEqualTo("AI_OCR_INVALID_IMAGE")
                );
    }

    @Test
    void rejectsAnImageLargerThanTenMegabytes() {
        byte[] content = new byte[10 * 1024 * 1024 + 1];
        System.arraycopy(pngBytes(), 0, content, 0, pngBytes().length);

        assertThatThrownBy(() -> service.extract(image("image/png", content)))
                .isInstanceOfSatisfying(InvalidRequestException.class, exception ->
                        assertThat(exception.code()).isEqualTo("AI_INPUT_LIMIT_EXCEEDED")
                );
    }

    @Test
    void reportsWhenNoTextIsDetected() {
        when(ocrProvider.extractDocumentText(any())).thenReturn(new AiOcrProviderResult("", 1));

        assertThatThrownBy(() -> service.extract(image("image/png", pngBytes())))
                .isInstanceOfSatisfying(InvalidRequestException.class, exception ->
                        assertThat(exception.code()).isEqualTo("AI_OCR_TEXT_NOT_DETECTED")
                );
    }

    @Test
    void hidesProviderConfigurationFailures() {
        when(ocrProvider.extractDocumentText(any())).thenThrow(new AiOcrProviderException(
                AiOcrProviderException.FailureType.UNAVAILABLE,
                "provider credential detail"
        ));

        assertThatThrownBy(() -> service.extract(image("image/png", pngBytes())))
                .isInstanceOfSatisfying(ServiceUnavailableException.class, exception -> {
                    assertThat(exception.code()).isEqualTo("AI_FEATURE_UNAVAILABLE");
                    assertThat(exception.getMessage()).doesNotContain("credential");
                });
    }

    @Test
    void hidesProviderResponseFailures() {
        when(ocrProvider.extractDocumentText(any())).thenThrow(new AiOcrProviderException(
                AiOcrProviderException.FailureType.PROVIDER_ERROR,
                "provider response detail"
        ));

        assertThatThrownBy(() -> service.extract(image("image/png", pngBytes())))
                .isInstanceOfSatisfying(BadGatewayException.class, exception -> {
                    assertThat(exception.code()).isEqualTo("AI_PROVIDER_ERROR");
                    assertThat(exception.getMessage()).doesNotContain("response detail");
                });
    }

    private MockMultipartFile image(String contentType, byte[] content) {
        return new MockMultipartFile("image", "toc.png", contentType, content);
    }

    private byte[] pngBytes() {
        return new byte[] {
                (byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00
        };
    }

    private byte[] jpegBytes() {
        return new byte[] {(byte) 0xff, (byte) 0xd8, (byte) 0xff, 0x00};
    }

    private byte[] webpBytes() {
        return new byte[] {
                0x52, 0x49, 0x46, 0x46,
                0x04, 0x00, 0x00, 0x00,
                0x57, 0x45, 0x42, 0x50
        };
    }
}
