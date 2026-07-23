package com.studypm.studylog;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * 学習記録変更後に画面へ返す実績工数の再計算結果を表す。
 */
public record StudyLogRecalculationResponse(
        UUID projectId,
        BigDecimal projectActualHours,
        UUID wbsTaskId,
        BigDecimal wbsTaskActualHours,
        UUID previousWbsTaskId,
        BigDecimal previousWbsTaskActualHours
) {
}
