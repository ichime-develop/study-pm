package com.studypm.common.api;

import java.util.List;

/**
 * APIエラー応答の共通形式を表す。
 * HTTPステータスの決定や業務例外の分類は各ハンドラ側で行う。
 */
public record ApiErrorResponse(
        String code,
        String message,
        List<ApiErrorDetail> details
) {
    public static ApiErrorResponse of(String code, String message) {
        return new ApiErrorResponse(code, message, List.of());
    }
}
