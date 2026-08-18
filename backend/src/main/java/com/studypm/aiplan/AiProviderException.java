package com.studypm.aiplan;

/**
 * OpenAI呼び出し失敗を通信再試行可否とともに表す。
 */
public class AiProviderException extends RuntimeException {

    private static final String DEFAULT_ERROR_CODE = "AI_PROVIDER_ERROR";

    private final String errorCode;
    private final boolean retryable;

    public AiProviderException(String message, boolean retryable) {
        this(DEFAULT_ERROR_CODE, message, retryable, null);
    }

    public AiProviderException(String message, boolean retryable, Throwable cause) {
        this(DEFAULT_ERROR_CODE, message, retryable, cause);
    }

    public AiProviderException(String errorCode, String message, boolean retryable) {
        this(errorCode, message, retryable, null);
    }

    public AiProviderException(String errorCode, String message, boolean retryable, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.retryable = retryable;
    }

    public String errorCode() {
        return errorCode;
    }

    public boolean isRetryable() {
        return retryable;
    }
}
