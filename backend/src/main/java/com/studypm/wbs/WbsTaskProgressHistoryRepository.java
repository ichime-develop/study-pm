package com.studypm.wbs;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * WBS進捗履歴の永続化を担当する。
 */
public interface WbsTaskProgressHistoryRepository extends JpaRepository<WbsTaskProgressHistory, UUID> {
}
