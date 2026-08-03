package com.studypm.aiplan;
import java.util.UUID;

import com.studypm.common.error.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 検証済みWBS下書きを所有者単位で取得する。
 */
@Service
public class AiPlanDraftService {

    private final AiPlanDraftRepository draftRepository;

    public AiPlanDraftService(AiPlanDraftRepository draftRepository) {
        this.draftRepository = draftRepository;
    }

    @Transactional(readOnly = true)
    public AiPlanDraftResponse get(UUID accountId, UUID draftId) {
        AiPlanDraft draft = draftRepository.findByIdAndAccount_Id(draftId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("AI_PLAN_NOT_FOUND", "対象のAI計画は見つかりません。"));
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
}
