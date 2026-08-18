package com.studypm.aiplan;

/**
 * OpenAI応答のJSON解析またはWBS構造検証に失敗したことを表す。
 */
public class AiStructuredOutputException extends RuntimeException {

    private static final String UNCLASSIFIED_REASON = "UNCLASSIFIED";

    private final String reasonCode;

    public AiStructuredOutputException(String message) {
        this(UNCLASSIFIED_REASON, message);
    }

    public AiStructuredOutputException(String message, Throwable cause) {
        this(UNCLASSIFIED_REASON, message, cause);
    }

    public AiStructuredOutputException(String reasonCode, String message) {
        super(message);
        this.reasonCode = reasonCode;
    }

    public AiStructuredOutputException(String reasonCode, String message, Throwable cause) {
        super(message, cause);
        this.reasonCode = reasonCode;
    }

    public String reasonCode() { return reasonCode; }
}
