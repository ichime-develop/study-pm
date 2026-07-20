package com.studypm.common.api;

/**
 * APIエラー応答の詳細1件を表す。
 * 主にバリデーションエラーの対象フィールドと理由を返すために使う。
 */
public record ApiErrorDetail(
        String field,
        String message
) {
}
