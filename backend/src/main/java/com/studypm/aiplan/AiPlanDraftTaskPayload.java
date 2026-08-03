package com.studypm.aiplan;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** AI下書き更新時に受け取る親タスクまたはLEAFタスクを表す。 */
public record AiPlanDraftTaskPayload(
        @NotBlank @Size(max = 100) String temporaryKey,
        @NotNull AiDraftTaskType taskType,
        @Size(max = 100) String parentTemporaryKey,
        @NotBlank @Size(max = 100) String name,
        @NotNull @Size(max = 5000) String description,
        LocalDate plannedStartDate,
        LocalDate plannedEndDate,
        BigDecimal plannedHours,
        @NotNull List<@NotBlank @Size(max = 100) String> sourceTemporaryKeys
) {
    AiWbsDraftTask toProposal() {
        return new AiWbsDraftTask(
                temporaryKey.trim(),
                taskType,
                parentTemporaryKey == null ? null : parentTemporaryKey.trim(),
                name.trim(),
                description,
                plannedStartDate,
                plannedEndDate,
                plannedHours,
                sourceTemporaryKeys
        );
    }
}
