// EVMまたはバーンダウンを算出できない理由と修正導線を表示する。
import { Link } from "react-router-dom";

import { analysisUnavailableMessage } from "./analysisFormatters";
import type { AnalysisUnavailableReason } from "./analysisTypes";

type AnalysisUnavailableNoticeProps = {
  projectId: string;
  reasons: AnalysisUnavailableReason[];
};

export const AnalysisUnavailableNotice = ({ projectId, reasons }: AnalysisUnavailableNoticeProps) => {
  const hasMissingSchedule = reasons.includes("MISSING_SCHEDULE");

  return (
    <div className="analysis-unavailable-notice">
      <p>進捗分析を算出できません。</p>
      <ul>
        {reasons.map((reason) => <li key={reason}>{analysisUnavailableMessage(reason)}</li>)}
      </ul>
      {hasMissingSchedule && (
        <Link className="secondary-link" to={`/projects/${projectId}/wbs`}>
          WBSで予定日を設定する
        </Link>
      )}
      {reasons.includes("NO_LEAF_TASKS") && (
        <Link className="secondary-link" to={`/projects/${projectId}/wbs`}>
          WBSタスクを追加する
        </Link>
      )}
    </div>
  );
};
