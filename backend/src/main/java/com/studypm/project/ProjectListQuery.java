package com.studypm.project;

/**
 * プロジェクト一覧取得の検索・並び替え・ページング条件を表す。
 */
public record ProjectListQuery(
        String keyword,
        String status,
        String sort,
        int page,
        int size
) {
}
