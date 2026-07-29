package com.studypm.analysis;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * JST基準日のEVM集計結果と算出不可理由を返すAPI応答を表す。
 */
public record EvmAnalysisResponse(
        LocalDate baseDate,
        @JsonProperty("isCalculable") boolean isCalculable,
        List<AnalysisUnavailableReason> unavailableReasons,
        BigDecimal bac,
        BigDecimal pv,
        BigDecimal ev,
        BigDecimal ac,
        BigDecimal sv,
        BigDecimal cv,
        BigDecimal spi,
        BigDecimal cpi
) {

    public static EvmAnalysisResponse unavailable(LocalDate baseDate, List<AnalysisUnavailableReason> reasons) {
        return new EvmAnalysisResponse(baseDate, false, List.copyOf(reasons), null, null, null, null, null, null, null, null);
    }
}
