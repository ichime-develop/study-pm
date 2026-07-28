// プロジェクト一覧の1件を比較可能な行として表示し、概要への選択操作を提供する。
import { useNavigate } from "react-router-dom";

import { formatHours, formatMonthDay, formatProgressRate, formatProjectStatus } from "../../shared/types/formatters";
import type { ProjectListItem } from "./projectTypes";

type ProjectCardProps = {
  project: ProjectListItem;
};

export const ProjectCard = ({ project }: ProjectCardProps) => {
  const navigate = useNavigate();
  const progressRate = Math.max(0, Math.min(project.progressRate ?? 0, 100));

  return (
    <button
      aria-label={`${project.name}の概要を開く`}
      className="project-list-row project-list-item"
      onClick={() => navigate(`/projects/${project.projectId}`)}
      type="button"
    >
      <span className="project-list-name">{project.name}</span>
      <span>
        <span className={`status-pill status-${project.status.toLowerCase().replace("_", "-")}`}>
          {formatProjectStatus(project.status)}
        </span>
      </span>
      <span>
        {formatMonthDay(project.startDate)} - {formatMonthDay(project.targetEndDate)}
      </span>
      <span className="project-list-progress">
        <span aria-hidden="true" className="project-list-progress-track">
          <span style={{ width: `${progressRate}%` }} />
        </span>
        <span>{formatProgressRate(project.progressRate)}</span>
      </span>
      <span>
        {formatHours(project.actualHours)} / {formatHours(project.plannedHours)}
      </span>
      <span className={project.hasDelay ? "project-list-warning" : undefined}>
        {project.hasDelay ? "遅延あり" : "なし"}
      </span>
    </button>
  );
};
