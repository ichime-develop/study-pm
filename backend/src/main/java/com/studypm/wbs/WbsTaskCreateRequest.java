package com.studypm.wbs;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * WBSタスク作成APIのリクエスト本文を表す。
 */
public record WbsTaskCreateRequest(
        @NotBlank
        String taskType,

        @NotBlank
        @Size(max = 100)
        String name,

        @Size(max = 5000)
        String description,

        UUID parentTaskId,
        LocalDate plannedStartDate,
        LocalDate plannedEndDate,
        BigDecimal plannedHours
) {

    public WbsTaskCreateCommand toCommand() {
        return new WbsTaskCreateCommand(
                taskType,
                name,
                description,
                parentTaskId,
                plannedStartDate,
                plannedEndDate,
                plannedHours
        );
    }
}
