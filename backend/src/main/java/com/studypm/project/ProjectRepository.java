package com.studypm.project;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Projectの永続化と所有者単位の取得を担当する。
 */
public interface ProjectRepository extends JpaRepository<Project, UUID> {

    List<Project> findAllByAccount_Id(UUID accountId);

    Optional<Project> findByIdAndAccount_Id(UUID projectId, UUID accountId);
}
