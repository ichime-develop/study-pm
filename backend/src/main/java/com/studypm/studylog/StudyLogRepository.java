package com.studypm.studylog;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 学習記録の所有者検証付き取得とプロジェクト内一覧を担当する。
 */
public interface StudyLogRepository extends JpaRepository<StudyLog, UUID> {

    @EntityGraph(attributePaths = "wbsTask")
    Page<StudyLog> findAllByProject_IdAndAccount_Id(UUID projectId, UUID accountId, Pageable pageable);

    @EntityGraph(attributePaths = "wbsTask")
    Page<StudyLog> findAllByProject_IdAndAccount_IdAndWbsTask_Id(
            UUID projectId,
            UUID accountId,
            UUID wbsTaskId,
            Pageable pageable
    );

    @EntityGraph(attributePaths = "wbsTask")
    Optional<StudyLog> findByIdAndAccount_Id(UUID studyLogId, UUID accountId);
}
