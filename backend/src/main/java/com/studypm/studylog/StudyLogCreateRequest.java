package com.studypm.studylog;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 学習記録登録APIのリクエスト本文を表す。
 */
public record StudyLogCreateRequest(
        @NotNull
        UUID wbsTaskId,

        @NotNull
        LocalDate studyDate,

        @NotNull
        BigDecimal studyHours,

        @Size(max = 5000)
        String memo
) {
    StudyLogCreateCommand toCommand() {
        return new StudyLogCreateCommand(wbsTaskId, studyDate, studyHours, memo);
    }
}
