package com.studypm.common.error;

import java.util.List;

import com.studypm.common.api.ApiErrorDetail;
import org.springframework.http.HttpStatus;

/**
 * 未存在、削除済み、所有者不一致を存在秘匿の404へ分類する。
 * implementation-policy.md §5.2 の業務エラー分類に対応する。
 */
public class ResourceNotFoundException extends ApplicationException {

    public ResourceNotFoundException(String code, String message) {
        super(HttpStatus.NOT_FOUND, code, message);
    }

    public ResourceNotFoundException(String code, String message, List<ApiErrorDetail> details) {
        super(HttpStatus.NOT_FOUND, code, message, details);
    }
}
