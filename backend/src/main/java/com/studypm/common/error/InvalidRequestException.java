package com.studypm.common.error;

import java.util.List;

import com.studypm.common.api.ApiErrorDetail;
import org.springframework.http.HttpStatus;

/**
 * Service層で検出した入力値や関連先の制約違反を400へ分類する。
 * implementation-policy.md §5.2 の業務エラー分類に対応する。
 */
public class InvalidRequestException extends ApplicationException {

    public InvalidRequestException(String code, String message) {
        super(HttpStatus.BAD_REQUEST, code, message);
    }

    public InvalidRequestException(String code, String message, List<ApiErrorDetail> details) {
        super(HttpStatus.BAD_REQUEST, code, message, details);
    }
}
