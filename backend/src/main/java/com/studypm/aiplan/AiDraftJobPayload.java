package com.studypm.aiplan;

import jakarta.validation.constraints.NotNull;

/**
 * WBS下書き生成ジョブを開始する際の生成方針を表す。
 */
public record AiDraftJobPayload(@NotNull Boolean deadlinePriority) {

    public boolean isDeadlinePriority() {
        return deadlinePriority;
    }
}
