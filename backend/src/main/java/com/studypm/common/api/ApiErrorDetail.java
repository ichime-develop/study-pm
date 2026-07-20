package com.studypm.common.api;

public record ApiErrorDetail(
        String field,
        String message
) {
}
