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
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * AI計画作成のOCR、入力保存、生成ジョブ、下書き編集・変換APIを提供する。
 */
@RestController
@RequestMapping("/api/ai-plan")
public class AiPlanController {

    private final AiPlanRequestService requestService;
    private final AiGenerationJobService jobService;
    private final AiPlanDraftService draftService;
    private final AiOcrService ocrService;
    private final AiFeatureAvailability featureAvailability;

    public AiPlanController(
            AiPlanRequestService requestService,
            AiGenerationJobService jobService,
            AiPlanDraftService draftService,
            AiOcrService ocrService,
            AiFeatureAvailability featureAvailability
    ) {
        this.requestService = requestService;
        this.jobService = jobService;
        this.draftService = draftService;
        this.ocrService = ocrService;
        this.featureAvailability = featureAvailability;
    }

    @PostMapping(value = "/ocr", consumes = "multipart/form-data")
    AiOcrResponse extractOcrText(
            @RequestPart(value = "image", required = false) MultipartFile image
    ) {
        featureAvailability.requireOcrAvailable();
        return ocrService.extract(image);
    }

    @PostMapping("/requests")
    ResponseEntity<AiPlanRequestResponse> createRequest(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @Valid @RequestBody AiPlanRequestPayload payload
    ) {
        featureAvailability.requireGenerationAvailable();
        AiPlanRequestResponse response = requestService.create(account.accountId(), payload.toCommand());
        return ResponseEntity.created(URI.create("/api/ai-plan/requests/" + response.generationRequestId())).body(response);
    }

    @GetMapping("/requests/{requestId}")
    AiPlanRequestResponse getRequest(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID requestId
    ) {
        featureAvailability.requireGenerationAvailable();
        return requestService.get(account.accountId(), requestId);
    }

    @PutMapping("/requests/{requestId}")
    AiPlanRequestResponse updateRequest(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID requestId,
            @Valid @RequestBody AiPlanRequestPayload payload
    ) {
        featureAvailability.requireGenerationAvailable();
        return requestService.update(account.accountId(), requestId, payload.toCommand());
    }

    @PostMapping("/requests/{requestId}/draft-jobs")
    ResponseEntity<AiGenerationJobResponse> createDraftJob(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID requestId,
            @Valid @RequestBody AiDraftJobPayload payload
    ) {
        featureAvailability.requireGenerationAvailable();
        AiGenerationJobResponse response = jobService.create(account.accountId(), requestId, payload.isDeadlinePriority());
        return ResponseEntity.accepted().body(response);
    }

    @GetMapping("/jobs/{jobId}")
    AiGenerationJobResponse getJob(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID jobId
    ) {
        featureAvailability.requireGenerationAvailable();
        return jobService.get(account.accountId(), jobId);
    }

    @PostMapping("/jobs/{jobId}/cancel")
    AiGenerationJobResponse cancelJob(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID jobId
    ) {
        featureAvailability.requireGenerationAvailable();
        return jobService.cancel(account.accountId(), jobId);
    }

    @GetMapping("/drafts/{draftId}")
    AiPlanDraftResponse getDraft(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID draftId
    ) {
        featureAvailability.requireGenerationAvailable();
        return draftService.get(account.accountId(), draftId);
    }

    @PutMapping("/drafts/{draftId}")
    AiPlanDraftResponse updateDraft(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID draftId,
            @Valid @RequestBody AiPlanDraftUpdatePayload payload
    ) {
        featureAvailability.requireGenerationAvailable();
        return draftService.update(account.accountId(), draftId, payload);
    }

    @PostMapping("/drafts/{draftId}/convert")
    ResponseEntity<AiPlanDraftConversionResponse> convertDraft(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID draftId,
            @Valid @RequestBody AiPlanDraftConvertPayload payload
    ) {
        featureAvailability.requireGenerationAvailable();
        return ResponseEntity.status(201).body(draftService.convert(account.accountId(), draftId, payload));
    }
}
