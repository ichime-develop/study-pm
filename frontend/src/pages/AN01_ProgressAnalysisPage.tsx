// AN01でEVM、バーンダウン、計画不整合をプロジェクト単位で表示する。
import { useParams } from "react-router-dom";

import { AnalysisUnavailableNotice } from "../features/analysis/AnalysisUnavailableNotice";
import { BurndownChart } from "../features/analysis/BurndownChart";
import { EvmMetricCards } from "../features/analysis/EvmMetricCards";
import { PlanWarningsList } from "../features/analysis/PlanWarningsList";
import { formatAnalysisHours, formatAnalysisNumber, formatSignedHours } from "../features/analysis/analysisFormatters";
import { useProjectBurndown, useProjectEvm, useProjectPlanWarnings } from "../features/analysis/useAnalysis";
import { useCurrentAccount, useLogout } from "../features/auth/useAuth";
import { canCompleteProject } from "../features/projects/projectCompletion";
import { ProjectNav } from "../features/projects/ProjectNav";
import { ProjectPageGate } from "../features/projects/ProjectPageGate";
import { useProject } from "../features/projects/useProjects";
import { useProjectWbs } from "../features/wbs/useWbs";
import { isApiClientError } from "../shared/api/apiTypes";
import { AppHeader } from "../shared/components/AppHeader";
import { Panel, PanelHeader } from "../shared/components/Panel";

export const ProgressAnalysisPage = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const accountQuery = useCurrentAccount();
  const logout = useLogout();
  const projectQuery = useProject(projectId);
  const wbsQuery = useProjectWbs(projectId);
  const evmQuery = useProjectEvm(projectId);
  const burndownQuery = useProjectBurndown(projectId);
  const planWarningsQuery = useProjectPlanWarnings(projectId);
  const queries = [accountQuery, projectQuery, wbsQuery, evmQuery, burndownQuery, planWarningsQuery];
  const projectPageError = queries.find((query) => query.isError)?.error;
  const isProjectNotFound = [
    projectQuery.error,
    wbsQuery.error,
    evmQuery.error,
    burndownQuery.error,
    planWarningsQuery.error,
  ].some((error) => isApiClientError(error) && error.status === 404);
  const isLoading = accountQuery.isLoading || queries.slice(1).some((query) => query.isPending);
  const pageData =
    accountQuery.data !== undefined &&
    projectQuery.data !== undefined &&
    wbsQuery.data !== undefined &&
    evmQuery.data !== undefined &&
    burndownQuery.data !== undefined &&
    planWarningsQuery.data !== undefined
      ? {
          account: accountQuery.data,
          burndown: burndownQuery.data,
          evm: evmQuery.data,
          planWarnings: planWarningsQuery.data,
          project: projectQuery.data,
          wbs: wbsQuery.data,
        }
      : undefined;

  return (
    <ProjectPageGate
      data={pageData}
      error={projectPageError}
      isLoading={isLoading}
      isProjectNotFound={isProjectNotFound}
      loadingMessage="進捗分析を読み込んでいます。"
      onRetry={() => queries.forEach((query) => void query.refetch())}
    >
      {({ account, burndown, evm, planWarnings, project, wbs }) => (
        <main className="app-page">
          <AppHeader account={account} isLoggingOut={logout.isPending} onLogout={() => logout.mutate()} title="進捗分析" />
          <ProjectNav canComplete={canCompleteProject(wbs.tasks)} hasNoWbsTasks={wbs.tasks.length === 0} project={project} />

          <Panel className="analysis-panel">
            <PanelHeader
              description={`基準日: ${evm.baseDate}（JST）`}
              eyebrow="AN01"
              title="EVM指標"
            />
            <EvmMetricCards evm={evm} />
            {!evm.isCalculable && <AnalysisUnavailableNotice projectId={project.projectId} reasons={evm.unavailableReasons} />}
            {evm.isCalculable && evm.unavailableReasons.length > 0 && (
              <AnalysisUnavailableNotice projectId={project.projectId} reasons={evm.unavailableReasons} />
            )}
          </Panel>

          <Panel className="analysis-panel">
            <PanelHeader eyebrow="AN01" title="バーンダウン" />
            {burndown.isCalculable ? (
              <>
                <BurndownChart actualPoints={burndown.actualPoints} idealPoints={burndown.idealPoints} />
                <dl className="analysis-difference-grid">
                  <div><dt>理想残</dt><dd>{formatAnalysisHours(burndown.idealRemainingHours)}</dd></div>
                  <div><dt>実績残</dt><dd>{formatAnalysisHours(burndown.actualRemainingHours)}</dd></div>
                  <div><dt>差分工数</dt><dd>{formatSignedHours(burndown.workDifferenceHours)}</dd></div>
                  <div><dt>差分日数</dt><dd>{burndown.dayDifference === null ? "-" : `${formatAnalysisNumber(burndown.dayDifference)}日`}</dd></div>
                </dl>
              </>
            ) : (
              <AnalysisUnavailableNotice projectId={project.projectId} reasons={burndown.unavailableReasons} />
            )}
          </Panel>

          <Panel className="analysis-panel">
            <PanelHeader eyebrow="AN01" title="計画不整合" />
            <PlanWarningsList projectId={project.projectId} warnings={planWarnings.warnings} />
          </Panel>
        </main>
      )}
    </ProjectPageGate>
  );
};
