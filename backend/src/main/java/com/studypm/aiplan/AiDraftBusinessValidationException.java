package com.studypm.aiplan;

/**
 * 構造は正しいが保存不能なWBS業務制約違反を表す。
 */
public class AiDraftBusinessValidationException extends RuntimeException {

    private final String errorCode;

    public AiDraftBusinessValidationException(String message) {
        this("AI_DRAFT_VALIDATION_FAILED", message);
    }

    public AiDraftBusinessValidationException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String errorCode() {
        return errorCode;
    }
}
