package com.studypm.common.error;

/**
 * 外部サービスや機能設定の不足により一時的に利用できない操作を503へ分類する。
 */
public class ServiceUnavailableException extends ApplicationException {

    public ServiceUnavailableException(String code, String message) {
        super(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, code, message);
    }
}
