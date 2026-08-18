package com.studypm.aiplan;

import java.util.List;

/**
 * Structured Outputsで受け取るWBS下書き全体を表す。
 */
public record AiWbsDraftProposal(
        AiWbsDraftProject project,
        List<AiWbsDraftTask> tasks,
        WbsSplitUnit wbsSplitUnit
) {
    public AiWbsDraftProposal {
        tasks = tasks == null ? List.of() : List.copyOf(tasks);
    }
}
