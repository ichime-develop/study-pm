// WB01のWBS一覧、基礎集計、親タスク・LEAFタスク作成を提供する。
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useCurrentAccount } from "../features/auth/useAuth";
import { useProject } from "../features/projects/useProjects";
import { WbsTaskCreatePanel } from "../features/wbs/WbsTaskCreatePanel";
import { WbsTaskTable } from "../features/wbs/WbsTaskTable";
import { useProjectWbs } from "../features/wbs/useWbs";
import type { WbsTaskType } from "../features/wbs/wbsTypes";
import { isApiClientError } from "../shared/api/apiTypes";
import { messageOf } from "../shared/api/errorMessages";
import { AppHeader } from "../shared/components/AppHeader";
import { ProjectNav } from "../shared/components/CM02_ProjectNav";
import { ErrorPanel } from "../shared/components/ErrorPanel";
import { LoadingPanel } from "../shared/components/LoadingPanel";
import { StatCard } from "../shared/components/StatCard";
import { formatHours, formatProgressRate } from "../shared/types/formatters";

export const WbsPage = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const accountQuery = useCurrentAccount();
  const projectQuery = useProject(projectId);
  const wbsQuery = useProjectWbs(projectId);
  const [createMode, setCreateMode] = useState<WbsTaskType | null>(null);
  const errors = [projectQuery.error, wbsQuery.error];
  const isProjectNotFound = errors.some((error) => isApiClientError(error) && error.status === 404);
  const isLoading = accountQuery.isLoading || projectQuery.isPending || wbsQuery.isPending;

  if (isLoading) {
    return <LoadingPanel message="WBSを読み込んでいます。" />;
  }

  if (isProjectNotFound) {
    return (
      <main className="app-page">
        <ErrorPanel message="対象のプロジェクトは存在しません。" />
        <Link className="primary-link" to="/projects">
          プロジェクト一覧へ戻る
        </Link>
      </main>
    );
  }

  if (accountQuery.data === undefined || projectQuery.data === undefined || wbsQuery.data === undefined) {
    const queryWithError = [accountQuery, projectQuery, wbsQuery].find((query) => query.isError);
    return (
      <main className="app-page">
        <ErrorPanel
          message={messageOf(queryWithError?.error)}
          onRetry={() => {
            void accountQuery.refetch();
            void projectQuery.refetch();
            void wbsQuery.refetch();
          }}
        />
      </main>
    );
  }

  const project = projectQuery.data;
  const wbs = wbsQuery.data;
  const hasNoWbsTasks = wbs.tasks.length === 0;

  return (
    <main className="app-page">
      <AppHeader account={accountQuery.data} title="WBS・ガント" />
      <ProjectNav hasNoWbsTasks={hasNoWbsTasks} project={project} />

      <section className="summary-grid wbs-summary-grid">
        <StatCard label="予定工数" value={formatHours(wbs.plannedHours)} />
        <StatCard label="実績工数" value={formatHours(wbs.actualHours)} />
        <StatCard label="進捗率" value={formatProgressRate(wbs.progressRate)} />
        <StatCard label="遅延" value={wbs.hasDelay ? "あり" : "なし"} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">WB01</p>
            <h2>WBS・ガントチャート</h2>
            <p className="section-description">
              親タスクは見出し、LEAFタスクは予定と進捗の管理対象です。実績工数は学習記録から集計します。
            </p>
          </div>
          <div className="button-row">
            <button className="secondary-button" onClick={() => setCreateMode("PARENT")} type="button">
              親タスクを追加
            </button>
            <button className="primary-button" onClick={() => setCreateMode("LEAF")} type="button">
              タスクを追加
            </button>
          </div>
        </div>

        <div className={createMode === null ? "wbs-workspace" : "wbs-workspace with-side-panel"}>
          <section className="wbs-table-panel" aria-label="WBSタスク一覧">
            <WbsTaskTable onCreate={setCreateMode} tasks={wbs.tasks} />
            <section className="gantt-placeholder" aria-labelledby="gantt-placeholder-title">
              <h3 id="gantt-placeholder-title">ガントチャート</h3>
              <p>
                表示期間: {wbs.ganttStartDate} - {wbs.ganttEndDate}
              </p>
              <p>タスクの予定期間を日付軸へ表示するガントバーは、次のスライスで追加します。</p>
            </section>
          </section>

          {createMode !== null && (
            <WbsTaskCreatePanel
              mode={createMode}
              onClose={() => setCreateMode(null)}
              projectId={project.projectId}
              tasks={wbs.tasks}
            />
          )}
        </div>
      </section>
    </main>
  );
};
