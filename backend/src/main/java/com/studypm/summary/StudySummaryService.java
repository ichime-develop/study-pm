package com.studypm.summary;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

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
        int continuousStudyDays = continuousStudyDays(queryRepository.distinctStudyDates(accountId));
        long inProgressProjectCount = queryRepository.inProgressProjectCount(accountId);
        return new StudySummaryResponse(continuousStudyDays, totalStudyHours, inProgressProjectCount);
    }

    private int continuousStudyDays(Iterable<LocalDate> studyDates) {
        Set<LocalDate> dateSet = new HashSet<>();
        studyDates.forEach(dateSet::add);

        LocalDate today = LocalDate.now(clock.withZone(JST));
        LocalDate anchor;
        if (dateSet.contains(today)) {
            anchor = today;
        } else if (dateSet.contains(today.minusDays(1))) {
            anchor = today.minusDays(1);
        } else {
            return 0;
        }

        int count = 0;
        while (dateSet.contains(anchor.minusDays(count))) {
            count++;
        }
        return count;
    }
}
