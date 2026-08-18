package com.studypm.aiplan;

import java.io.IOException;
import java.util.Arrays;

import com.studypm.common.error.BadGatewayException;
import com.studypm.common.error.InvalidRequestException;
import com.studypm.common.error.ServiceUnavailableException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * OCR対象画像を検証し、画像を永続化せずに抽出テキストへ変換する。
 */
@Service
public class AiOcrService {

    private static final long MAX_IMAGE_BYTES = 10L * 1024L * 1024L;
    private static final byte[] JPEG_SIGNATURE = {(byte) 0xff, (byte) 0xd8, (byte) 0xff};
    private static final byte[] PNG_SIGNATURE = {
            (byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
    };
    private static final byte[] RIFF_SIGNATURE = {0x52, 0x49, 0x46, 0x46};
    private static final byte[] WEBP_SIGNATURE = {0x57, 0x45, 0x42, 0x50};

    private final AiOcrProvider ocrProvider;

    public AiOcrService(AiOcrProvider ocrProvider) {
        this.ocrProvider = ocrProvider;
    }

    public AiOcrResponse extract(MultipartFile image) {
        byte[] imageContent = validatedContent(image);
        try {
            AiOcrProviderResult result = ocrProvider.extractDocumentText(imageContent);
            if (result == null) {
                throw new BadGatewayException(
                        "AI_PROVIDER_ERROR",
                        "画像の文字読み取りに失敗しました。時間をおいて再試行してください。"
                );
            }
            if (result.text() == null || result.text().isBlank()) {
                throw new InvalidRequestException(
                        "AI_OCR_TEXT_NOT_DETECTED",
                        "画像から文字を読み取れませんでした。画像を確認するか、目次を直接入力してください。"
                );
            }
            return new AiOcrResponse(result.text(), result.detectedPageCount());
        } catch (AiOcrProviderException exception) {
            throw applicationExceptionFor(exception);
        }
    }

    private byte[] validatedContent(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw invalidImage();
        }
        if (image.getSize() > MAX_IMAGE_BYTES) {
            throw new InvalidRequestException(
                    "AI_INPUT_LIMIT_EXCEEDED",
                    "画像は1枚10MB以下にしてください。"
            );
        }
        try {
            byte[] content = image.getBytes();
            if (content.length == 0 || content.length > MAX_IMAGE_BYTES || !hasSupportedSignature(content)) {
                throw invalidImage();
            }
            return content;
        } catch (IOException exception) {
            throw invalidImage();
        }
    }

    private boolean hasSupportedSignature(byte[] content) {
        return startsWith(content, JPEG_SIGNATURE)
                || startsWith(content, PNG_SIGNATURE)
                || isWebp(content);
    }

    private boolean isWebp(byte[] content) {
        return startsWith(content, RIFF_SIGNATURE)
                && content.length >= 12
                && Arrays.equals(content, 8, 12, WEBP_SIGNATURE, 0, WEBP_SIGNATURE.length);
    }

    private boolean startsWith(byte[] content, byte[] signature) {
        return content.length >= signature.length
                && Arrays.equals(content, 0, signature.length, signature, 0, signature.length);
    }

    private RuntimeException applicationExceptionFor(AiOcrProviderException exception) {
        return switch (exception.failureType()) {
            case INVALID_IMAGE -> invalidImage();
            case UNAVAILABLE -> new ServiceUnavailableException(
                    "AI_FEATURE_UNAVAILABLE",
                    "画像の文字読み取りは現在利用できません。"
            );
            case PROVIDER_ERROR -> new BadGatewayException(
                    "AI_PROVIDER_ERROR",
                    "画像の文字読み取りに失敗しました。時間をおいて再試行してください。"
            );
        };
    }

    private InvalidRequestException invalidImage() {
        return new InvalidRequestException(
                "AI_OCR_INVALID_IMAGE",
                "jpg、jpeg、png、webp形式の画像を選択してください。"
        );
    }
}
