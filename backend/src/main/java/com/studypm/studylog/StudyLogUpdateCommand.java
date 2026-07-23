package com.studypm.studylog;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * 学習記録更新APIの入力値をServiceへ渡す。
 */
public record StudyLogUpdateCommand(
        UUID wbsTaskId,
        LocalDate studyDate,
        BigDecimal studyHours,
        String memo
) {
}
