// プロジェクト機能に属する画面間ナビゲーションを表示する。
import { Link, NavLink } from "react-router-dom";

import { formatProjectStatus } from "../../shared/format/formatters";
import type { ProjectBasic } from "./projectTypes";

type ProjectNavProps = {
  hasNoWbsTasks: boolean;
  project: ProjectBasic;
};

export const ProjectNav = ({ hasNoWbsTasks, project }: ProjectNavProps) => {
  const projectPath = `/projects/${project.projectId}`;

  return (
    <section className="project-nav" aria-label="プロジェクト内ナビゲーション">
      <div className="project-nav-summary">
        <Link className="breadcrumb-link" to="/projects">
          プロジェクト一覧へ戻る
        </Link>
        <div className="project-nav-name-row">
          <h2>{project.name}</h2>
          <span className={`status-pill status-${project.status.toLowerCase().replace("_", "-")}`}>
            {formatProjectStatus(project.status)}
          </span>
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
        <span aria-disabled="true" className="project-tab disabled" title="MVP 2で提供予定">
          進捗分析
        </span>
      </nav>
    </section>
  );
};

const tabClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? "project-tab active" : "project-tab";
