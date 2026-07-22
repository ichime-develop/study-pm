package com.studypm.common.error;

import java.util.List;
import java.util.Objects;

import com.studypm.common.api.ApiErrorDetail;
import org.springframework.http.HttpStatus;

/**
 * Service層で検出したアプリケーション例外の共通基底を表す。
 * HTTPステータスと業務エラーコードを保持し、API層で共通エラー応答へ変換する。
 * implementation-policy.md §5.2 の業務エラー分類に対応する。
 */
public abstract class ApplicationException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final List<ApiErrorDetail> details;

    protected ApplicationException(HttpStatus status, String code, String message) {
        this(status, code, message, List.of());
    }

    protected ApplicationException(HttpStatus status, String code, String message, List<ApiErrorDetail> details) {
        super(Objects.requireNonNull(message, "message must not be null"));
        this.status = Objects.requireNonNull(status, "status must not be null");
        this.code = Objects.requireNonNull(code, "code must not be null");
        this.details = List.copyOf(Objects.requireNonNull(details, "details must not be null"));
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }

    public List<ApiErrorDetail> details() {
        return details;
    }
}
