package com.studypm.project;

/**
 * offset/page方式のページ情報を表す。
 */
public record ProjectPageResponse(
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
