package com.studypm.aiplan;

import java.net.URI;
import java.util.UUID;

import com.studypm.auth.AuthenticatedAccount;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * AI計画作成の入力保存と画面復帰用取得APIを提供する。
 */
@RestController
@RequestMapping("/api/ai-plan")
public class AiPlanController {

    private final AiPlanRequestService requestService;
    private final AiGenerationJobService jobService;
    private final AiPlanDraftService draftService;
    private final AiFeatureAvailability featureAvailability;

    public AiPlanController(
            AiPlanRequestService requestService,
            AiGenerationJobService jobService,
            AiPlanDraftService draftService,
            AiFeatureAvailability featureAvailability
    ) {
        this.requestService = requestService;
        this.jobService = jobService;
        this.draftService = draftService;
        this.featureAvailability = featureAvailability;
    }

    @PostMapping("/requests")
    ResponseEntity<AiPlanRequestResponse> createRequest(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @Valid @RequestBody AiPlanRequestPayload payload
    ) {
        featureAvailability.requireAvailable();
        AiPlanRequestResponse response = requestService.create(account.accountId(), payload.toCommand());
        return ResponseEntity.created(URI.create("/api/ai-plan/requests/" + response.generationRequestId())).body(response);
    }

    @GetMapping("/requests/{requestId}")
    AiPlanRequestResponse getRequest(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID requestId
    ) {
        featureAvailability.requireAvailable();
        return requestService.get(account.accountId(), requestId);
    }

    @PutMapping("/requests/{requestId}")
    AiPlanRequestResponse updateRequest(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID requestId,
            @Valid @RequestBody AiPlanRequestPayload payload
    ) {
        featureAvailability.requireAvailable();
        return requestService.update(account.accountId(), requestId, payload.toCommand());
    }

    @PostMapping("/requests/{requestId}/draft-jobs")
    ResponseEntity<AiGenerationJobResponse> createDraftJob(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID requestId,
            @Valid @RequestBody AiDraftJobPayload payload
    ) {
        featureAvailability.requireAvailable();
        AiGenerationJobResponse response = jobService.create(account.accountId(), requestId, payload.isDeadlinePriority());
        return ResponseEntity.accepted().body(response);
    }

    @GetMapping("/jobs/{jobId}")
    AiGenerationJobResponse getJob(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID jobId
    ) {
        featureAvailability.requireAvailable();
        return jobService.get(account.accountId(), jobId);
    }

    @PostMapping("/jobs/{jobId}/cancel")
    AiGenerationJobResponse cancelJob(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID jobId
    ) {
        featureAvailability.requireAvailable();
        return jobService.cancel(account.accountId(), jobId);
    }

    @GetMapping("/drafts/{draftId}")
    AiPlanDraftResponse getDraft(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID draftId
    ) {
        featureAvailability.requireAvailable();
        return draftService.get(account.accountId(), draftId);
    }
}
