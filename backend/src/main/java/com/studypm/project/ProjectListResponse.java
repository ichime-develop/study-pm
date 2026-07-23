package com.studypm.project;

import java.util.List;

/**
 * プロジェクト一覧APIのレスポンスを表す。
 */
public record ProjectListResponse(
        List<ProjectListItemResponse> items,
        ProjectPageResponse page
) {
}
