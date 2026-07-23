package com.studypm.studylog;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * 学習記録の一覧・詳細で返す1件分の表示値を表す。
 */
public record StudyLogResponse(
        UUID studyLogId,
        UUID projectId,
        UUID wbsTaskId,
        String wbsTaskName,
        LocalDate studyDate,
        BigDecimal studyHours,
        String memo,
        Instant createdAt,
        Instant updatedAt
) {
    public static StudyLogResponse from(StudyLog studyLog) {
        return new StudyLogResponse(
                studyLog.id(),
                studyLog.project().id(),
                studyLog.wbsTask().id(),
                studyLog.wbsTask().name(),
                studyLog.studyDate(),
                studyLog.studyHours(),
                studyLog.memo(),
                studyLog.createdAt(),
                studyLog.updatedAt()
        );
    }
}
