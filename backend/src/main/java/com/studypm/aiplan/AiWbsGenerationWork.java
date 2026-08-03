package com.studypm.aiplan;

import java.time.Instant;
import java.util.UUID;

/**
 * DBロックを解放した後に外部サービスへ渡せる生成ジョブのスナップショット。
 */
public record AiWbsGenerationWork(
        UUID jobId,
        String modelName,
        String promptVersion,
        String schemaVersion,
        String strategyVersion,
        Instant deadlineAt,
        boolean deadlinePriority,
        AiWbsGenerationInput input
) {
}
