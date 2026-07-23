package com.studypm.project;

import java.net.URI;
import java.util.UUID;

import com.studypm.auth.AuthenticatedAccount;
import com.studypm.auth.SuccessResponse;
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
 * プロジェクト一覧、作成、詳細取得、更新、削除APIを提供する。
 */
@Validated
@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    ProjectListResponse list(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        return projectService.list(
                account.accountId(),
                new ProjectListQuery(keyword, status, sort, page, size)
        );
    }

    @PostMapping
    ResponseEntity<ProjectBasicResponse> create(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @Valid @RequestBody ProjectCreateRequest request
    ) {
        ProjectBasicResponse response = projectService.create(account.accountId(), request.toCommand());
        return ResponseEntity.created(URI.create("/api/projects/" + response.projectId())).body(response);
    }

    @GetMapping("/{projectId}")
    ProjectBasicResponse get(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID projectId
    ) {
        return projectService.get(account.accountId(), projectId);
    }

    @PatchMapping("/{projectId}")
    ProjectBasicResponse update(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID projectId,
            @Valid @RequestBody ProjectUpdateRequest request
    ) {
        return projectService.update(account.accountId(), projectId, request.toCommand());
    }

    @DeleteMapping("/{projectId}")
    SuccessResponse delete(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID projectId
    ) {
        projectService.delete(account.accountId(), projectId);
        return SuccessResponse.ok();
    }
}
