package com.studypm.project;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ProjectPeriodHistoryの永続化を担当する。
 */
public interface ProjectPeriodHistoryRepository extends JpaRepository<ProjectPeriodHistory, UUID> {
}
