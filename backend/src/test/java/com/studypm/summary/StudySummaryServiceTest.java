package com.studypm.summary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * StudySummaryServiceの総学習時間、連続学習日数、進行中件数を検証する。
 */
class StudySummaryServiceTest {

    private final StudySummaryQueryRepository queryRepository = mock(StudySummaryQueryRepository.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-07-23T00:00:00Z"), ZoneOffset.UTC);
    private final UUID accountId = UUID.randomUUID();

    private StudySummaryService service;

    @BeforeEach
    void setUp() {
        service = new StudySummaryService(queryRepository, clock);
    }

    @Test
    void summaryReturnsZeroWhenStudyLogsAreEmpty() {
        when(queryRepository.totalStudyHours(accountId)).thenReturn(BigDecimal.ZERO);
        when(queryRepository.distinctStudyDates(accountId)).thenReturn(List.of());
        when(queryRepository.inProgressProjectCount(accountId)).thenReturn(0L);

        StudySummaryResponse response = service.summary(accountId);

        assertThat(response.continuousStudyDays()).isZero();
        assertThat(response.totalStudyHours()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.inProgressProjectCount()).isZero();
    }

    @Test
    void continuousStudyDaysStartsFromTodayWhenTodayHasStudyLog() {
        when(queryRepository.totalStudyHours(accountId)).thenReturn(new BigDecimal("3.00"));
        when(queryRepository.distinctStudyDates(accountId)).thenReturn(List.of(
                LocalDate.parse("2026-07-23"),
                LocalDate.parse("2026-07-22"),
                LocalDate.parse("2026-07-21"),
                LocalDate.parse("2026-07-19")
        ));
        when(queryRepository.inProgressProjectCount(accountId)).thenReturn(2L);

        StudySummaryResponse response = service.summary(accountId);

        assertThat(response.continuousStudyDays()).isEqualTo(3);
        assertThat(response.totalStudyHours()).isEqualByComparingTo("3.00");
        assertThat(response.inProgressProjectCount()).isEqualTo(2);
    }

    @Test
    void continuousStudyDaysStartsFromYesterdayWhenTodayDoesNotHaveStudyLog() {
        when(queryRepository.totalStudyHours(accountId)).thenReturn(BigDecimal.ONE);
        when(queryRepository.distinctStudyDates(accountId)).thenReturn(List.of(
                LocalDate.parse("2026-07-22"),
                LocalDate.parse("2026-07-21")
        ));
        when(queryRepository.inProgressProjectCount(accountId)).thenReturn(1L);

        StudySummaryResponse response = service.summary(accountId);

        assertThat(response.continuousStudyDays()).isEqualTo(2);
    }

    @Test
    void continuousStudyDaysReturnsZeroWhenTodayAndYesterdayDoNotHaveStudyLog() {
        when(queryRepository.totalStudyHours(accountId)).thenReturn(BigDecimal.ONE);
        when(queryRepository.distinctStudyDates(accountId)).thenReturn(List.of(LocalDate.parse("2026-07-21")));
        when(queryRepository.inProgressProjectCount(accountId)).thenReturn(1L);

        StudySummaryResponse response = service.summary(accountId);

        assertThat(response.continuousStudyDays()).isZero();
    }

    @Test
    void continuousStudyDaysCountsDuplicateDatesOnce() {
        when(queryRepository.totalStudyHours(accountId)).thenReturn(BigDecimal.ONE);
        when(queryRepository.distinctStudyDates(accountId)).thenReturn(List.of(
                LocalDate.parse("2026-07-23"),
                LocalDate.parse("2026-07-23"),
                LocalDate.parse("2026-07-22")
        ));
        when(queryRepository.inProgressProjectCount(accountId)).thenReturn(1L);

        StudySummaryResponse response = service.summary(accountId);

        assertThat(response.continuousStudyDays()).isEqualTo(2);
    }
}
