package com.studypm.aiplan;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
/** AI下書きを所有者単位で取得する。 */
public interface AiPlanDraftRepository extends JpaRepository<AiPlanDraft, UUID> {
    Optional<AiPlanDraft> findByIdAndAccount_Id(UUID id, UUID accountId);
    Optional<AiPlanDraft> findByGenerationJob_Id(UUID generationJobId);
}
