package com.studypm.aiplan;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studypm.common.error.BusinessConflictException;
import com.studypm.common.error.InvalidRequestException;
import com.studypm.common.error.ResourceNotFoundException;
import com.studypm.project.ProjectBasicResponse;
import com.studypm.project.ProjectCreateCommand;
import com.studypm.project.ProjectService;
import com.studypm.wbs.WbsTaskCreateCommand;
import com.studypm.wbs.WbsTaskResponse;
import com.studypm.wbs.WbsTaskService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 検証済みWBS下書きの所有者制御、編集再検証、通常Project/WBSへの変換を担う。
 */
@Service
public class AiPlanDraftService {

    private final AiPlanDraftRepository draftRepository;
    private final AiWbsGenerationInputFactory inputFactory;
    private final AiWbsDraftValidator draftValidator;
    private final ProjectService projectService;
    private final WbsTaskService wbsTaskService;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public AiPlanDraftService(
            AiPlanDraftRepository draftRepository,
            AiWbsGenerationInputFactory inputFactory,
            AiWbsDraftValidator draftValidator,
            ProjectService projectService,
            WbsTaskService wbsTaskService,
            ObjectMapper objectMapper,
            Clock clock
    ) {
        this.draftRepository = draftRepository;
        this.inputFactory = inputFactory;
        this.draftValidator = draftValidator;
        this.projectService = projectService;
        this.wbsTaskService = wbsTaskService;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public AiPlanDraftResponse get(UUID accountId, UUID draftId) {
        AiPlanDraft draft = draftRepository.findByIdAndAccount_Id(draftId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("AI_PLAN_NOT_FOUND", "対象のAI計画は見つかりません。"));
        return responseFor(draft);
    }

    @Transactional
    public AiPlanDraftResponse update(UUID accountId, UUID draftId, AiPlanDraftUpdatePayload payload) {
        AiPlanDraft draft = findOwnedForUpdate(accountId, draftId);
        if (draft.isConverted()) {
            throw new BusinessConflictException("AI_PLAN_ALREADY_CONVERTED", "このWBS下書きはすでにプロジェクトへ変換されています。");
        }
        validateRevision(draft, payload.draftRevision());
        requireCurrentInput(draft);
        AiWbsGenerationInput input = inputFactory.forRequest(draft.generationRequest());
        AiValidatedWbsDraft validatedDraft = validate(input, payload.toProposal(wbsSplitUnitFor(input)));
        draft.update(validatedDraft, clock.instant());
        return responseFor(draft);
    }

    @Transactional
    public AiPlanDraftConversionResponse convert(UUID accountId, UUID draftId, AiPlanDraftConvertPayload payload) {
        AiPlanDraft draft = findOwnedForUpdate(accountId, draftId);
        if (draft.isConverted()) {
            throw new BusinessConflictException("AI_PLAN_ALREADY_CONVERTED", "このWBS下書きはすでにプロジェクトへ変換されています。");
        }
        validateRevision(draft, payload.draftRevision());
        requireCurrentInput(draft);
        AiWbsGenerationInput input = inputFactory.forRequest(draft.generationRequest());
        AiValidatedWbsDraft validatedDraft = validate(input, proposalFrom(draft, wbsSplitUnitFor(input)));

        ProjectBasicResponse project = projectService.create(accountId, new ProjectCreateCommand(
                validatedDraft.proposal().project().name(),
                validatedDraft.proposal().project().description(),
                validatedDraft.proposal().project().startDate(),
                validatedDraft.proposal().project().targetEndDate()
        ));
        Map<String, UUID> parentTaskIds = new HashMap<>();
        List<UUID> wbsTaskIds = new java.util.ArrayList<>();
        for (AiWbsDraftTask task : validatedDraft.proposal().tasks()) {
            if (task.taskType() == AiDraftTaskType.PARENT) {
                WbsTaskResponse created = wbsTaskService.create(accountId, project.projectId(), new WbsTaskCreateCommand(
                        task.taskType().name(), task.name(), task.description(), null, null, null, null
                ));
                parentTaskIds.put(task.temporaryKey(), created.wbsTaskId());
                wbsTaskIds.add(created.wbsTaskId());
            }
        }
        for (AiWbsDraftTask task : validatedDraft.proposal().tasks()) {
            if (task.taskType() == AiDraftTaskType.LEAF) {
                WbsTaskResponse created = wbsTaskService.create(accountId, project.projectId(), new WbsTaskCreateCommand(
                        task.taskType().name(), task.name(), task.description(), parentTaskIds.get(task.parentTemporaryKey()),
                        task.plannedStartDate(), task.plannedEndDate(), task.plannedHours()
                ));
                wbsTaskIds.add(created.wbsTaskId());
            }
        }
        draft.markConverted(project.projectId(), clock.instant());
        return new AiPlanDraftConversionResponse(project.projectId(), wbsTaskIds);
    }

    private AiPlanDraftResponse responseFor(AiPlanDraft draft) {
        return new AiPlanDraftResponse(
                draft.id(),
                draft.revision(),
                new AiPlanDraftProjectResponse(
                        draft.projectName(),
                        draft.projectDescription() == null ? "" : draft.projectDescription(),
                        draft.startDate(),
                        draft.targetEndDate()
                ),
                draft.tasks(),
                new AiPlanDraftValidationResponse(draft.validationStatus()),
                draft.warnings(),
                draft.relaxationOptions()
        );
    }

    private AiPlanDraft findOwnedForUpdate(UUID accountId, UUID draftId) {
        return draftRepository.findByIdAndAccount_IdForUpdate(draftId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("AI_PLAN_NOT_FOUND", "対象のAI計画は見つかりません。"));
    }

    private void validateRevision(AiPlanDraft draft, int actualRevision) {
        if (draft.revision() != actualRevision) {
            throw new BusinessConflictException("STALE_AI_PLAN_REVISION", "WBS下書きが更新されています。最新の内容を確認してください。");
        }
    }

    private void requireCurrentInput(AiPlanDraft draft) {
        if (draft.generationRequest().updatedAt().isAfter(draft.createdAt())) {
            throw new BusinessConflictException(
                    "AI_DRAFT_REGENERATION_REQUIRED", "入力内容が変更されているため、WBS下書きを再生成してください。"
            );
        }
    }

    private AiValidatedWbsDraft validate(AiWbsGenerationInput input, AiWbsDraftProposal proposal) {
        try {
            return draftValidator.validate(input, proposal);
        } catch (AiDraftBusinessValidationException exception) {
            throw new InvalidRequestException(exception.errorCode(), exception.getMessage());
        } catch (AiStructuredOutputException exception) {
            throw new InvalidRequestException("AI_DRAFT_VALIDATION_FAILED", exception.getMessage());
        }
    }

    private AiWbsDraftProposal proposalFrom(AiPlanDraft draft, WbsSplitUnit wbsSplitUnit) {
        List<AiWbsDraftTask> tasks;
        try {
            tasks = objectMapper.convertValue(draft.tasks(), new TypeReference<List<AiWbsDraftTask>>() { });
        } catch (IllegalArgumentException exception) {
            throw new InvalidRequestException("AI_DRAFT_VALIDATION_FAILED", "保存済みのWBS下書きを読み取れません。");
        }
        return new AiWbsDraftProposal(
                new AiWbsDraftProject(
                        draft.projectName(),
                        draft.projectDescription() == null ? "" : draft.projectDescription(),
                        draft.startDate(),
                        draft.targetEndDate()
                ),
                tasks,
                wbsSplitUnit
        );
    }

    private WbsSplitUnit wbsSplitUnitFor(AiWbsGenerationInput input) {
        try {
            return WbsSplitUnit.valueOf(input.constraints().path("wbsSplitUnit").asText("SECTION"));
        } catch (IllegalArgumentException exception) {
            throw new InvalidRequestException("AI_DRAFT_VALIDATION_FAILED", "保存済み入力のWBS分割単位が正しくありません。");
        }
    }
}
