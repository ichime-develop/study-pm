package com.studypm.project;

import java.time.LocalDate;

/**
 * プロジェクト作成ユースケースの入力値を表す。
 */
public record ProjectCreateCommand(
        String name,
        String description,
        LocalDate startDate,
        LocalDate targetEndDate
) {
}
