package com.studypm.aiplan;

import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
/** AI下書きを所有者単位で取得する。 */
public interface AiPlanDraftRepository extends JpaRepository<AiPlanDraft, UUID> {
    Optional<AiPlanDraft> findByIdAndAccount_Id(UUID id, UUID accountId);
    Optional<AiPlanDraft> findByGenerationJob_Id(UUID generationJobId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select draft from AiPlanDraft draft where draft.id = :draftId and draft.account.id = :accountId")
    Optional<AiPlanDraft> findByIdAndAccount_IdForUpdate(@Param("draftId") UUID draftId, @Param("accountId") UUID accountId);
}
