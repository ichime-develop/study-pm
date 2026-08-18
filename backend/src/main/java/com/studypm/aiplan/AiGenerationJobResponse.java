package com.studypm.aiplan;

import java.time.Instant;
import java.util.UUID;

/**
 * クライアントのポーリングに返すAI生成ジョブ状態を表す。
 */
public record AiGenerationJobResponse(
        UUID jobId,
        String jobType,
        AiGenerationJobStatus status,
        Instant acceptedAt,
        Instant deadlineAt,
        AiGenerationJobError error,
        UUID draftId
) {
}
