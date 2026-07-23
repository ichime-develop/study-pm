package com.studypm.summary;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

import com.studypm.common.time.ContinuousStudyDays;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * ユーザー単位の総学習時間、連続学習日数、進行中件数を算出する。
 */
@Service
public class StudySummaryService {

    private static final ZoneId JST = ZoneId.of("Asia/Tokyo");

    private final StudySummaryQueryRepository queryRepository;
    private final Clock clock;

    public StudySummaryService(StudySummaryQueryRepository queryRepository, Clock clock) {
        this.queryRepository = queryRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public StudySummaryResponse summary(UUID accountId) {
        BigDecimal totalStudyHours = queryRepository.totalStudyHours(accountId);
        LocalDate today = LocalDate.now(clock.withZone(JST));
        int continuousStudyDays = ContinuousStudyDays.count(queryRepository.distinctStudyDates(accountId), today);
        long inProgressProjectCount = queryRepository.inProgressProjectCount(accountId);
        return new StudySummaryResponse(continuousStudyDays, totalStudyHours, inProgressProjectCount);
    }
}
