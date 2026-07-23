package com.studypm.common.time;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

/**
 * 学習日集合から、JST基準日を起点にした連続学習日数を算出する。
 */
public final class ContinuousStudyDays {

    private ContinuousStudyDays() {
    }

    public static int count(Iterable<LocalDate> studyDates, LocalDate today) {
        Set<LocalDate> dateSet = new HashSet<>();
        studyDates.forEach(dateSet::add);

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
