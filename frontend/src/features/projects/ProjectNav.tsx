import { useState } from "react";

import { Link, NavLink } from "react-router-dom";

import { formatProjectStatus } from "../../shared/format/formatters";
import { ProjectStatusModal } from "./ProjectStatusModal";
import type { ProjectBasic, ProjectStatus } from "./projectTypes";
import { useUpdateProject } from "./useProjects";

// プロジェクト機能に属する画面間ナビゲーションを表示する。

type ProjectNavProps = {
  canComplete: boolean;
  hasNoWbsTasks: boolean;
  project: ProjectBasic;
};

export const ProjectNav = ({ canComplete, hasNoWbsTasks, project }: ProjectNavProps) => {
  const projectPath = `/projects/${project.projectId}`;
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const updateProject = useUpdateProject(project.projectId);

  const handleStatusChange = (status: ProjectStatus) => {
    updateProject.mutate(
      {
        description: project.description,
        name: project.name,
        startDate: project.startDate,
        status,
        targetEndDate: project.targetEndDate,
      },
      { onSuccess: () => setIsStatusModalOpen(false) },
    );
  };

  return (
    <>
      <section className="project-nav" aria-label="プロジェクト内ナビゲーション">
        <div className="project-nav-summary">
          <Link className="breadcrumb-link" to="/projects">
            プロジェクト一覧へ戻る
          </Link>
          <div className="project-nav-name-row">
            <h2>{project.name}</h2>
            <button
              aria-label={`プロジェクトの状態を変更。現在: ${formatProjectStatus(project.status)}`}
              className={`status-pill status-${project.status.toLowerCase().replace("_", "-")} status-change-button`}
              onClick={() => setIsStatusModalOpen(true)}
              type="button"
            >
              {formatProjectStatus(project.status)} <span aria-hidden="true">▾</span>
            </button>
          </div>
          <span className="project-nav-period">
            {project.startDate} - {project.targetEndDate}
          </span>
        </div>
        <nav className="project-tabs" aria-label="プロジェクト内機能">
          <NavLink className={tabClassName} end to={projectPath}>
            概要
          </NavLink>
          <NavLink className={tabClassName} to={`${projectPath}/wbs`}>
            WBS
          </NavLink>
          {hasNoWbsTasks ? (
            <span
              aria-disabled="true"
              className="project-tab disabled"
              title="WBSにタスクを追加すると利用できます"
            >
              学習記録
            </span>
          ) : (
            <NavLink className={tabClassName} to={`${projectPath}/logs`}>
              学習記録
            </NavLink>
          )}
          <NavLink className={tabClassName} to={`${projectPath}/analysis`}>
            進捗分析
          </NavLink>
        </nav>
      </section>
      {isStatusModalOpen && (
        <ProjectStatusModal
          canComplete={canComplete}
          error={updateProject.error}
          isSaving={updateProject.isPending}
          onCancel={() => setIsStatusModalOpen(false)}
          onConfirm={handleStatusChange}
          projectName={project.name}
          status={project.status}
        />
      )}
    </>
  );
};

const tabClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? "project-tab active" : "project-tab";
