package com.studypm.project;

/**
 * プロジェクト概要で表示する警告の種類と文言を表す。
 */
public record ProjectWarningResponse(
        String code,
        String message
) {
}
