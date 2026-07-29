// PJ03からEVMの状態と計画不整合を簡潔に確認できる導線を表示する。
import { Link } from "react-router-dom";

import { useProjectEvm, useProjectPlanWarnings } from "./useAnalysis";

type AnalysisOverviewLinkProps = {
  projectId: string;
};

export const AnalysisOverviewLink = ({ projectId }: AnalysisOverviewLinkProps) => {
  const evmQuery = useProjectEvm(projectId);
  const warningsQuery = useProjectPlanWarnings(projectId);
  const evmSummary = evmQuery.data === undefined
    ? "EVMを読み込んでいます。"
    : evmQuery.data.isCalculable ? "EVMを確認できます。" : "EVMは現在算出できません。";
  const warningSummary = warningsQuery.data === undefined
    ? "計画不整合を確認しています。"
    : warningsQuery.data.warnings.length === 0
      ? "計画不整合はありません。"
      : `計画不整合が${warningsQuery.data.warnings.length}件あります。`;

  return (
    <section aria-labelledby="analysis-overview-title" className="overview-section analysis-overview-link">
      <div className="panel-header">
        <h3 id="analysis-overview-title">進捗分析</h3>
        <Link className="secondary-link" to={`/projects/${projectId}/analysis`}>
          進捗分析で確認
        </Link>
      </div>
      <p>{evmSummary}</p>
      <p>{warningSummary}</p>
    </section>
  );
};
