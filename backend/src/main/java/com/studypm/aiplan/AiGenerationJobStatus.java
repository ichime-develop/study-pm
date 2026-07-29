package com.studypm.aiplan;

/**
 * 非同期WBS生成ジョブの状態を表す。
 */
public enum AiGenerationJobStatus {
    QUEUED,
    PROCESSING,
    CANCEL_REQUESTED,
    COMPLETED,
    FAILED,
    CANCELED;

    public boolean isActive() {
        return this == QUEUED || this == PROCESSING || this == CANCEL_REQUESTED;
    }

    public boolean isTerminal() {
        return !isActive();
    }
}
