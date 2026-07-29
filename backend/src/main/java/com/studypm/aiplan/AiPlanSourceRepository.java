package com.studypm.aiplan;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * AI生成依頼配下の入力元を順序付きで取得・置換する。
 */
public interface AiPlanSourceRepository extends JpaRepository<AiPlanSource, UUID> {
    List<AiPlanSource> findAllByGenerationRequest_IdOrderBySourceOrderAsc(UUID generationRequestId);
    void deleteAllByGenerationRequest_Id(UUID generationRequestId);
}
