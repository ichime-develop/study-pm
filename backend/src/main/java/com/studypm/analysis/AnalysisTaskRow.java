package com.studypm.analysis;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * EVMとバーンダウンの計算に必要な現存LEAFタスクの読み取り値を表す。
 */
public record AnalysisTaskRow(
        UUID taskId,
        String name,
        LocalDate plannedStartDate,
        LocalDate plannedEndDate,
        BigDecimal plannedHours,
        int progressRate
) {

    public boolean hasSchedule() {
        return plannedStartDate != null && plannedEndDate != null;
    }
}
