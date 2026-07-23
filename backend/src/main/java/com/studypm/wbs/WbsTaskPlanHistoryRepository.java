package com.studypm.wbs;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * WBS計画履歴の永続化を担当する。
 */
public interface WbsTaskPlanHistoryRepository extends JpaRepository<WbsTaskPlanHistory, UUID> {
}
