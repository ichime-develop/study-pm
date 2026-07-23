package com.studypm.project;

import com.studypm.common.error.InvalidRequestException;

/**
 * 学習プロジェクトの状態を表す。
 */
public enum ProjectStatus {
    NOT_STARTED,
    IN_PROGRESS,
    COMPLETED;

    public static ProjectStatus parse(String rawStatus) {
        if (rawStatus == null || rawStatus.isBlank()) {
            throw invalidStatus();
        }
        try {
            return ProjectStatus.valueOf(rawStatus.trim());
        } catch (IllegalArgumentException exception) {
            throw invalidStatus();
        }
    }

    public static ProjectStatus parseQuery(String rawStatus) {
        try {
            return ProjectStatus.valueOf(rawStatus.trim());
        } catch (IllegalArgumentException exception) {
            throw invalidStatus();
        }
    }

    private static InvalidRequestException invalidStatus() {
        return new InvalidRequestException("INVALID_PROJECT_STATUS", "プロジェクト状態の指定が正しくありません。");
    }
}
