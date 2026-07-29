// WB01で計画不整合の件数と進捗分析への導線を表示する。
import { Link } from "react-router-dom";

import { useProjectPlanWarnings } from "./useAnalysis";

type WbsPlanWarningNoticeProps = {
  projectId: string;
};

export const WbsPlanWarningNotice = ({ projectId }: WbsPlanWarningNoticeProps) => {
  const planWarningsQuery = useProjectPlanWarnings(projectId);
  const warnings = planWarningsQuery.data?.warnings;

  if (warnings === undefined || warnings.length === 0) {
    return null;
  }

  return (
    <p className="notice notice-warning">
      計画不整合が{warnings.length}件あります。<Link to={`/projects/${projectId}/analysis`}>進捗分析で確認</Link>
    </p>
  );
};
