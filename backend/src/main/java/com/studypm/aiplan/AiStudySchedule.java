package com.studypm.aiplan;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * AI計画で共通利用する曜日別の学習可能時間を表す。
 */
public record AiStudySchedule(
        BigDecimal weekdayHours,
        BigDecimal weekendHours,
        Set<DayOfWeek> unavailableWeekdays
) {

    private static final BigDecimal QUARTER_HOUR = new BigDecimal("0.25");
    private static final BigDecimal DEFAULT_WEEKDAY_HOURS = BigDecimal.ONE;
    private static final BigDecimal DEFAULT_WEEKEND_HOURS = BigDecimal.valueOf(2);

    public static AiStudySchedule from(JsonNode constraints) {
        BigDecimal weekdayHours = decimal(constraints, "weekdayAvailableHours", DEFAULT_WEEKDAY_HOURS);
        BigDecimal weekendHours = decimal(constraints, "weekendAvailableHours", DEFAULT_WEEKEND_HOURS);
        validateHours(weekdayHours, "weekdayAvailableHours");
        validateHours(weekendHours, "weekendAvailableHours");
        return new AiStudySchedule(weekdayHours, weekendHours, unavailableWeekdays(constraints));
    }

    public BigDecimal availableHours(LocalDate date) {
        if (unavailableWeekdays.contains(date.getDayOfWeek())) {
            return BigDecimal.ZERO;
        }
        return date.getDayOfWeek().getValue() <= DayOfWeek.FRIDAY.getValue()
                ? weekdayHours
                : weekendHours;
    }

    public long countAvailableDays(LocalDate startDate, LocalDate endDate) {
        return startDate.datesUntil(endDate.plusDays(1))
                .filter(date -> availableHours(date).signum() > 0)
                .count();
    }

    private static BigDecimal decimal(JsonNode constraints, String fieldName, BigDecimal defaultValue) {
        JsonNode value = constraints.get(fieldName);
        if (value == null || value.isNull()) {
            return defaultValue;
        }
        if (!value.isNumber()) {
            throw new IllegalArgumentException(fieldName + " must be a number.");
        }
        return value.decimalValue();
    }

    private static void validateHours(BigDecimal hours, String fieldName) {
        if (hours.signum() < 0 || hours.remainder(QUARTER_HOUR).signum() != 0) {
            throw new IllegalArgumentException(fieldName + " must be a non-negative quarter-hour value.");
        }
    }

    private static Set<DayOfWeek> unavailableWeekdays(JsonNode constraints) {
        Set<DayOfWeek> result = new HashSet<>();
        JsonNode values = constraints.path("unavailableWeekdays");
        if (!values.isMissingNode() && !values.isArray()) {
            throw new IllegalArgumentException("unavailableWeekdays must be an array.");
        }
        for (JsonNode value : values) {
            try {
                result.add(DayOfWeek.valueOf(value.asText()));
            } catch (IllegalArgumentException exception) {
                throw new IllegalArgumentException("unavailableWeekdays contains an invalid value.", exception);
            }
        }
        return Set.copyOf(result);
    }
}
