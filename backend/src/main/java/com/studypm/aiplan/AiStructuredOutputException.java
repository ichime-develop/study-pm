package com.studypm.aiplan;

/**
 * OpenAI応答のJSON解析またはWBS構造検証に失敗したことを表す。
 */
public class AiStructuredOutputException extends RuntimeException {

    public AiStructuredOutputException(String message) {
        super(message);
    }

    public AiStructuredOutputException(String message, Throwable cause) {
        super(message, cause);
    }
}
