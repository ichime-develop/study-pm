package com.studypm.wbs;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * WBSタスクの所有者検証付き取得と親子取得を担当する。
 */
public interface WbsTaskRepository extends JpaRepository<WbsTask, UUID> {

    List<WbsTask> findAllByProject_IdAndProject_Account_Id(UUID projectId, UUID accountId);

    Optional<WbsTask> findByIdAndProject_Account_Id(UUID taskId, UUID accountId);

    Optional<WbsTask> findByIdAndProject_IdAndProject_Account_Id(UUID taskId, UUID projectId, UUID accountId);

    List<WbsTask> findAllByParentWbsTask_Id(UUID parentTaskId);
}
