package com.studypm.aiplan;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * AI生成ジョブの所有者検証と日次上限判定を担当する。
 */
public interface AiGenerationJobRepository extends JpaRepository<AiGenerationJob, UUID> {
    Optional<AiGenerationJob> findByIdAndAccount_Id(UUID id, UUID accountId);
    long countByAccount_IdAndCreatedAtGreaterThanEqual(UUID accountId, Instant startOfDay);
}
