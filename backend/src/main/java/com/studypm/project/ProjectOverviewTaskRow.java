package com.studypm.project;

import java.time.LocalDate;
import java.util.UUID;

/**
 * プロジェクト概要の未完了タスク抽出SQLから返す行を表す。
 */
public record ProjectOverviewTaskRow(
        UUID wbsTaskId,
        String name,
        LocalDate plannedEndDate,
        int progressRate,
        boolean hasDelay
) {
}
