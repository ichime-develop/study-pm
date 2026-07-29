package com.studypm.analysis;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * バーンダウンチャートの1日分の残予定工数を表す。
 */
public record BurndownPointResponse(LocalDate date, BigDecimal remainingHours) {
}
