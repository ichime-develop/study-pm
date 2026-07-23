package com.studypm.project;

import java.time.LocalDate;

/**
 * プロジェクト更新ユースケースの入力値を表す。
 */
public record ProjectUpdateCommand(
        String name,
        String description,
        LocalDate startDate,
        LocalDate targetEndDate,
        String status
) {
}
