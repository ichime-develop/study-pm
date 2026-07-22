package com.studypm.common.error;

import java.util.List;

import com.studypm.common.api.ApiErrorDetail;
import org.springframework.http.HttpStatus;

/**
 * 現在のデータ状態により実行できない業務操作を409へ分類する。
 * implementation-policy.md §5.2 の業務エラー分類に対応する。
 */
public class BusinessConflictException extends ApplicationException {

    public BusinessConflictException(String code, String message) {
        super(HttpStatus.CONFLICT, code, message);
    }

    public BusinessConflictException(String code, String message, List<ApiErrorDetail> details) {
        super(HttpStatus.CONFLICT, code, message, details);
    }
}
