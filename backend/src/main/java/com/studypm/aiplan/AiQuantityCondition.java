package com.studypm.aiplan;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * AI計画の総量と1日量から必要日数を決定する数量条件を表す。
 */
public record AiQuantityCondition(String unit, BigDecimal totalAmount, BigDecimal dailyAmount) {

    public static Optional<AiQuantityCondition> from(JsonNode constraints) {
        JsonNode quantity = constraints.path("quantityCondition");
        if (!quantity.isObject() || !quantity.hasNonNull("totalAmount") || !quantity.hasNonNull("dailyAmount")) {
            return Optional.empty();
        }
        if (!quantity.path("totalAmount").isNumber() || !quantity.path("dailyAmount").isNumber()) {
            throw new IllegalArgumentException("quantity amounts must be numbers.");
        }
        BigDecimal total = quantity.path("totalAmount").decimalValue();
        BigDecimal daily = quantity.path("dailyAmount").decimalValue();
        if (total.signum() <= 0 || daily.signum() <= 0) {
            throw new IllegalArgumentException("quantity amounts must be positive.");
        }
        return Optional.of(new AiQuantityCondition(quantity.path("unit").asText(""), total, daily));
    }

    public int requiredDays() {
        return totalAmount.divide(dailyAmount, 0, RoundingMode.CEILING).intValueExact();
    }
}
