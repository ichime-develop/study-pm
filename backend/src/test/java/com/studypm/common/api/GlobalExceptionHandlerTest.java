package com.studypm.common.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import com.studypm.common.error.BusinessConflictException;
import com.studypm.common.error.InvalidRequestException;
import com.studypm.common.error.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * アプリケーション例外が共通エラー応答へ変換されることを検証する。
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void invalidRequestExceptionReturnsBadRequestAndCode() {
        ResponseEntity<ApiErrorResponse> response = handler.handleApplicationException(
                new InvalidRequestException("INVALID_STUDY_LOG_TASK", "学習記録に指定できないタスクです。")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody())
                .isEqualTo(ApiErrorResponse.of("INVALID_STUDY_LOG_TASK", "学習記録に指定できないタスクです。"));
    }

    @Test
    void resourceNotFoundExceptionReturnsNotFoundAndCode() {
        ResponseEntity<ApiErrorResponse> response = handler.handleApplicationException(
                new ResourceNotFoundException("RESOURCE_NOT_FOUND", "対象が見つかりません。")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody())
                .isEqualTo(ApiErrorResponse.of("RESOURCE_NOT_FOUND", "対象が見つかりません。"));
    }

    @Test
    void businessConflictExceptionReturnsConflictAndCode() {
        ResponseEntity<ApiErrorResponse> response = handler.handleApplicationException(
                new BusinessConflictException("TASK_HAS_STUDY_LOGS", "学習記録があるタスクは削除できません。")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody())
                .isEqualTo(ApiErrorResponse.of("TASK_HAS_STUDY_LOGS", "学習記録があるタスクは削除できません。"));
    }

    @Test
    void applicationExceptionReturnsDetailsWhenProvided() {
        List<ApiErrorDetail> details = List.of(new ApiErrorDetail("wbsTaskId", "同じプロジェクトのリーフタスクを指定してください。"));

        ResponseEntity<ApiErrorResponse> response = handler.handleApplicationException(
                new InvalidRequestException("INVALID_STUDY_LOG_TASK", "入力内容を確認してください。", details)
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody())
                .isEqualTo(new ApiErrorResponse("INVALID_STUDY_LOG_TASK", "入力内容を確認してください。", details));
    }
}
