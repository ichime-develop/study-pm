package com.studypm.aiplan;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

/**
 * AI生成ジョブの所有者検証と日次上限判定を担当する。
 */
public interface AiGenerationJobRepository extends JpaRepository<AiGenerationJob, UUID> {
    Optional<AiGenerationJob> findByIdAndAccount_Id(UUID id, UUID accountId);
    List<AiGenerationJob> findAllByAccount_IdAndStatusIn(UUID accountId, Collection<AiGenerationJobStatus> statuses);
    long countByAccount_IdAndCreatedAtGreaterThanEqual(UUID accountId, Instant startOfDay);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AiGenerationJob> findFirstByStatusOrderByCreatedAtAsc(AiGenerationJobStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from AiGenerationJob job where job.id = :jobId")
    Optional<AiGenerationJob> findByIdForUpdate(@Param("jobId") UUID jobId);
}
