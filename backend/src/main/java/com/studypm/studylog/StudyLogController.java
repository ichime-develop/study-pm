package com.studypm.studylog;

import java.net.URI;
import java.util.UUID;

import com.studypm.auth.AuthenticatedAccount;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * プロジェクト内学習記録の一覧、登録、詳細取得、更新、削除APIを提供する。
 */
@Validated
@RestController
@RequestMapping
public class StudyLogController {

    private final StudyLogService studyLogService;

    public StudyLogController(StudyLogService studyLogService) {
        this.studyLogService = studyLogService;
    }

    @GetMapping("/api/projects/{projectId}/study-logs")
    StudyLogListResponse list(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID projectId,
            @RequestParam(required = false) UUID taskId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        return studyLogService.list(account.accountId(), projectId, taskId, page, size);
    }

    @PostMapping("/api/projects/{projectId}/study-logs")
    ResponseEntity<StudyLogMutationResponse> create(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID projectId,
            @Valid @RequestBody StudyLogCreateRequest request
    ) {
        StudyLogMutationResponse response = studyLogService.create(account.accountId(), projectId, request.toCommand());
        return ResponseEntity.created(URI.create("/api/study-logs/" + response.studyLog().studyLogId()))
                .body(response);
    }

    @GetMapping("/api/study-logs/{studyLogId}")
    StudyLogResponse get(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID studyLogId
    ) {
        return studyLogService.get(account.accountId(), studyLogId);
    }

    @PatchMapping("/api/study-logs/{studyLogId}")
    StudyLogMutationResponse update(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID studyLogId,
            @Valid @RequestBody StudyLogUpdateRequest request
    ) {
        return studyLogService.update(account.accountId(), studyLogId, request.toCommand());
    }

    @DeleteMapping("/api/study-logs/{studyLogId}")
    StudyLogDeleteResponse delete(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID studyLogId
    ) {
        return studyLogService.delete(account.accountId(), studyLogId);
    }
}
