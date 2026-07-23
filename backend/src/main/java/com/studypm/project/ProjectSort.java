package com.studypm.project;

import java.util.Arrays;

import com.studypm.common.error.InvalidRequestException;

/**
 * プロジェクト一覧の並び順指定を表す。
 */
public enum ProjectSort {
    UPDATED_AT_DESC("updatedAtDesc"),
    UPDATED_AT_ASC("updatedAtAsc"),
    START_DATE_ASC("startDateAsc"),
    START_DATE_DESC("startDateDesc"),
    TARGET_END_DATE_ASC("targetEndDateAsc"),
    TARGET_END_DATE_DESC("targetEndDateDesc"),
    PROGRESS_RATE_ASC("progressRateAsc"),
    PROGRESS_RATE_DESC("progressRateDesc");

    private final String value;

    ProjectSort(String value) {
        this.value = value;
    }

    public static ProjectSort parse(String rawSort) {
        if (rawSort == null || rawSort.isBlank()) {
            return UPDATED_AT_DESC;
        }
        return Arrays.stream(values())
                .filter(sort -> sort.value.equals(rawSort.trim()))
                .findFirst()
                .orElseThrow(() -> new InvalidRequestException(
                        "INVALID_PROJECT_SORT",
                        "プロジェクト一覧の並び順指定が正しくありません。"
                ));
    }
}
