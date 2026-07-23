package com.studypm.studylog;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * 学習記録登録APIの入力値をServiceへ渡す。
 */
public record StudyLogCreateCommand(
        UUID wbsTaskId,
        LocalDate studyDate,
        BigDecimal studyHours,
        String memo
) {
}
