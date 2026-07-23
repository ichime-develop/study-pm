package com.studypm.project;

import java.util.List;

import com.studypm.common.api.PageResponse;

/**
 * プロジェクト一覧APIのレスポンスを表す。
 */
public record ProjectListResponse(
        List<ProjectListItemResponse> items,
        PageResponse page
) {
}
