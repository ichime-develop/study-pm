// プロジェクト一覧の1件分を主要指標付きで表示する。
import { Link } from "react-router-dom";

import { formatHours, formatProgressRate, formatProjectStatus } from "../../shared/types/formatters";
import type { ProjectListItem } from "./projectTypes";

type ProjectCardProps = {
  project: ProjectListItem;
};

export const ProjectCard = ({ project }: ProjectCardProps) => (
  <article className="project-card">
    <div>
      <span className={`status-pill status-${project.status.toLowerCase().replace("_", "-")}`}>
        {formatProjectStatus(project.status)}
      </span>
      {project.hasDelay && <span className="warning-pill">遅延あり</span>}
    </div>
    <h2>{project.name}</h2>
    <p>{project.description ?? "説明は未設定です。"}</p>
    <dl className="metric-grid">
      <div>
        <dt>進捗率</dt>
        <dd>{formatProgressRate(project.progressRate)}</dd>
      </div>
      <div>
        <dt>予定工数</dt>
        <dd>{formatHours(project.plannedHours)}</dd>
      </div>
      <div>
        <dt>実績工数</dt>
        <dd>{formatHours(project.actualHours)}</dd>
      </div>
      <div>
        <dt>期間</dt>
        <dd>
          {project.startDate} - {project.targetEndDate}
        </dd>
      </div>
    </dl>
    <div className="card-actions">
      <Link className="primary-link" to={`/projects/${project.projectId}`}>
        概要を見る
      </Link>
      <Link className="secondary-link" to={`/projects/${project.projectId}/wbs`}>
        WBSへ
      </Link>
    </div>
  </article>
);
