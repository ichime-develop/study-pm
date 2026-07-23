package com.studypm.wbs;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * WBSタスク基本・計画情報更新APIのリクエスト本文を表す。
 */
public record WbsTaskUpdateRequest(
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

    public WbsTaskUpdateCommand toCommand() {
        return new WbsTaskUpdateCommand(
                name,
                description,
                parentTaskId,
                plannedStartDate,
                plannedEndDate,
                plannedHours
        );
    }
}
