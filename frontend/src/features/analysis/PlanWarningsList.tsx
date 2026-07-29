// 計画不整合をWBSで修正できる一覧として表示する。
import { Link } from "react-router-dom";

import type { PlanWarning } from "./analysisTypes";

type PlanWarningsListProps = {
  projectId: string;
  warnings: PlanWarning[];
};

export const PlanWarningsList = ({ projectId, warnings }: PlanWarningsListProps) => {
  if (warnings.length === 0) {
    return <p className="notice notice-success">プロジェクト期間に対する計画不整合はありません。</p>;
  }

  return (
    <ul className="analysis-warning-list">
      {warnings.map((warning) => (
        <li key={`${warning.taskId}-${warning.type}`}>
          <Link to={`/projects/${projectId}/wbs`}>{warning.taskName}</Link>
          <span>{warning.message}</span>
        </li>
      ))}
    </ul>
  );
};
