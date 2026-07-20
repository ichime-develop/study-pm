package com.studypm.common.api;

import java.util.List;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiErrorResponse> handleMethodArgumentNotValid(MethodArgumentNotValidException exception) {
        List<ApiErrorDetail> details = exception.getBindingResult().getFieldErrors().stream()
                .map(this::toDetail)
                .toList();
        return ResponseEntity.badRequest()
                .body(new ApiErrorResponse("VALIDATION_ERROR", "入力内容を確認してください。", details));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ApiErrorResponse> handleConstraintViolation(ConstraintViolationException exception) {
        List<ApiErrorDetail> details = exception.getConstraintViolations().stream()
                .map(violation -> new ApiErrorDetail(violation.getPropertyPath().toString(), violation.getMessage()))
                .toList();
        return ResponseEntity.badRequest()
                .body(new ApiErrorResponse("VALIDATION_ERROR", "入力内容を確認してください。", details));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiErrorResponse> handleException(Exception exception) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiErrorResponse.of("INTERNAL_SERVER_ERROR", "予期しないエラーが発生しました。"));
    }

    private ApiErrorDetail toDetail(FieldError fieldError) {
        return new ApiErrorDetail(fieldError.getField(), fieldError.getDefaultMessage());
    }
}
