package com.studypm.aiplan;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * AI生成依頼を所有者単位で取得する。
 */
public interface AiPlanGenerationRequestRepository extends JpaRepository<AiPlanGenerationRequest, UUID> {
    Optional<AiPlanGenerationRequest> findByIdAndAccount_Id(UUID id, UUID accountId);
}
