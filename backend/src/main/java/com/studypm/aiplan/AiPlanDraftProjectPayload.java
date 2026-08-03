package com.studypm.aiplan;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** AI下書き更新時に受け取るプロジェクト基本情報を表す。 */
public record AiPlanDraftProjectPayload(
        @NotBlank @Size(max = 100) String name,
        @NotNull @Size(max = 5000) String description,
        @NotNull LocalDate startDate,
        @NotNull LocalDate targetEndDate
) {
    AiWbsDraftProject toProposal() {
        return new AiWbsDraftProject(name.trim(), description, startDate, targetEndDate);
    }
}
