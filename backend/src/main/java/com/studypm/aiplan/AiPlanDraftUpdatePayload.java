package com.studypm.aiplan;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** AI下書きの編集内容を一括で受け取る。 */
public record AiPlanDraftUpdatePayload(
        @Min(1) int draftRevision,
        @NotNull @Valid AiPlanDraftProjectPayload project,
        @NotNull List<@Valid AiPlanDraftTaskPayload> tasks
) {
    AiWbsDraftProposal toProposal(WbsSplitUnit wbsSplitUnit) {
        return new AiWbsDraftProposal(
                project.toProposal(),
                tasks.stream().map(AiPlanDraftTaskPayload::toProposal).toList(),
                wbsSplitUnit
        );
    }
}
