package com.studypm.wbs;

import java.net.URI;
import java.util.UUID;

import com.studypm.auth.AuthenticatedAccount;
import com.studypm.auth.SuccessResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * WBS一覧、タスク作成、詳細取得、更新、進捗更新、削除APIを提供する。
 */
@RestController
@RequestMapping
public class WbsTaskController {

    private final WbsTaskService wbsTaskService;

    public WbsTaskController(WbsTaskService wbsTaskService) {
        this.wbsTaskService = wbsTaskService;
    }

    @GetMapping("/api/projects/{projectId}/wbs")
    WbsListResponse list(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID projectId
    ) {
        return wbsTaskService.list(account.accountId(), projectId);
    }

    @PostMapping("/api/projects/{projectId}/wbs-tasks")
    ResponseEntity<WbsTaskResponse> create(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID projectId,
            @Valid @RequestBody WbsTaskCreateRequest request
    ) {
        WbsTaskResponse response = wbsTaskService.create(account.accountId(), projectId, request.toCommand());
        return ResponseEntity.created(URI.create("/api/wbs-tasks/" + response.wbsTaskId())).body(response);
    }

    @GetMapping("/api/wbs-tasks/{taskId}")
    WbsTaskResponse get(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID taskId
    ) {
        return wbsTaskService.get(account.accountId(), taskId);
    }

    @PatchMapping("/api/wbs-tasks/{taskId}")
    WbsTaskResponse update(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID taskId,
            @Valid @RequestBody WbsTaskUpdateRequest request
    ) {
        return wbsTaskService.update(account.accountId(), taskId, request.toCommand());
    }

    @PatchMapping("/api/wbs-tasks/{taskId}/progress")
    WbsProgressUpdateResponse updateProgress(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID taskId,
            @Valid @RequestBody WbsProgressUpdateRequest request
    ) {
        return wbsTaskService.updateProgress(account.accountId(), taskId, request.toCommand());
    }

    @DeleteMapping("/api/wbs-tasks/{taskId}")
    SuccessResponse delete(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID taskId
    ) {
        wbsTaskService.delete(account.accountId(), taskId);
        return SuccessResponse.ok();
    }
}
