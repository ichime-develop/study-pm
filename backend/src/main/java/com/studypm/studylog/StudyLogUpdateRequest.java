package com.studypm.studylog;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 学習記録更新APIのリクエスト本文を表す。
 */
public record StudyLogUpdateRequest(
        @NotNull
        UUID wbsTaskId,

        @NotNull
        LocalDate studyDate,

        @NotNull
        BigDecimal studyHours,

        @Size(max = 5000)
        String memo
) {
    StudyLogUpdateCommand toCommand() {
        return new StudyLogUpdateCommand(wbsTaskId, studyDate, studyHours, memo);
    }
}
