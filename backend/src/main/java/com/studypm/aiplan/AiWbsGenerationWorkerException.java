package com.studypm.aiplan;

import java.util.UUID;

/**
 * ワーカー内部障害を入力本文や外部応答本文を含めずに識別する。
 */
public class AiWbsGenerationWorkerException extends RuntimeException {

    private final UUID jobId;
    private final String failureType;

    public AiWbsGenerationWorkerException(UUID jobId, RuntimeException cause) {
        super("AI WBS generation worker failed.", cause);
        this.jobId = jobId;
        this.failureType = cause.getClass().getName();
    }

    public UUID jobId() {
        return jobId;
    }

    public String failureType() {
        return failureType;
    }
}
