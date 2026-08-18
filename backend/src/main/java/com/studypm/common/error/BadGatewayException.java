package com.studypm.common.error;

import org.springframework.http.HttpStatus;

/**
 * 外部サービスの不正応答または通信失敗を、内部情報を隠した502へ分類する。
 */
public class BadGatewayException extends ApplicationException {

    public BadGatewayException(String code, String message) {
        super(HttpStatus.BAD_GATEWAY, code, message);
    }
}
