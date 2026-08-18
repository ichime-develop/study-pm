package com.studypm.aiplan;

/**
 * OCRサービス失敗を、利用者へ返す分類だけに変換して保持する。
 */
public class AiOcrProviderException extends RuntimeException {

    private final FailureType failureType;

    public AiOcrProviderException(FailureType failureType, String message) {
        super(message);
        this.failureType = failureType;
    }

    public AiOcrProviderException(FailureType failureType, String message, Throwable cause) {
        super(message, cause);
        this.failureType = failureType;
    }

    public FailureType failureType() {
        return failureType;
    }

    public enum FailureType {
        INVALID_IMAGE,
        UNAVAILABLE,
        PROVIDER_ERROR
    }
}
