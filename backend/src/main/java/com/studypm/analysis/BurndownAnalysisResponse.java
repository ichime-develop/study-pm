package com.studypm.analysis;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * バーンダウンの理想線、実績線、基準日時点の差分を返すAPI応答を表す。
 */
public record BurndownAnalysisResponse(
        LocalDate baseDate,
        @JsonProperty("isCalculable") boolean isCalculable,
        List<AnalysisUnavailableReason> unavailableReasons,
        List<BurndownPointResponse> idealPoints,
        List<BurndownPointResponse> actualPoints,
        BigDecimal idealRemainingHours,
        BigDecimal actualRemainingHours,
        BigDecimal workDifferenceHours,
        BigDecimal dayDifference
) {

    public static BurndownAnalysisResponse unavailable(LocalDate baseDate, List<AnalysisUnavailableReason> reasons) {
        return new BurndownAnalysisResponse(baseDate, false, List.copyOf(reasons), List.of(), List.of(), null, null, null, null);
    }
}
