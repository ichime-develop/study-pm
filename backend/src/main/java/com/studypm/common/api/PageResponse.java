package com.studypm.common.api;

/**
 * offset/page方式のページ情報をAPI横断で表す。
 */
public record PageResponse(
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
