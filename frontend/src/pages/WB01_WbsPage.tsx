// WB01のWBS一覧、基礎集計、親タスク・LEAFタスク作成を提供する。
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useCurrentAccount } from "../features/auth/useAuth";
import { useProject } from "../features/projects/useProjects";
import { WbsTaskCreatePanel } from "../features/wbs/WbsTaskCreatePanel";
import { WbsTaskDetailPanel } from "../features/wbs/WbsTaskDetailPanel";
import { WbsGanttChart } from "../features/wbs/WbsGanttChart";
import { WbsTaskTable } from "../features/wbs/WbsTaskTable";
import { useProjectWbs } from "../features/wbs/useWbs";
import type { WbsTaskType } from "../features/wbs/wbsTypes";
import { StudyLogCreatePanel } from "../features/studyLogs/StudyLogCreatePanel";
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
  const [panel, setPanel] = useState<WbsPanel>({ kind: "none" });
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
  const selectedTaskId = panel.kind === "taskDetail" || panel.kind === "studyLogCreate" ? panel.taskId : null;
  const selectedTask = wbs.tasks.find((task) => task.wbsTaskId === selectedTaskId);
  const isSidePanelOpen = panel.kind === "taskCreate" || selectedTask !== undefined;

  const handleCreate = (taskType: WbsTaskType) => {
    setPanel({ kind: "taskCreate", taskType });
  };

  const handleSelectTask = (taskId: string) => {
    setPanel({ kind: "taskDetail", taskId });
  };

  const handleTaskNotFound = () => {
    setPanel({ kind: "none" });
    void wbsQuery.refetch();
  };

  const handleStudyLogCreated = (taskId: string) => {
    setPanel({
      kind: "taskDetail",
      taskId,
      successMessage: "学習記録を登録しました。実績工数を更新しました。",
    });
  };

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
            <button className="secondary-button" onClick={() => handleCreate("PARENT")} type="button">
              親タスクを追加
            </button>
            <button className="primary-button" onClick={() => handleCreate("LEAF")} type="button">
              タスクを追加
            </button>
          </div>
        </div>

        <div className={isSidePanelOpen ? "wbs-workspace with-side-panel" : "wbs-workspace"}>
          <section className="wbs-table-panel" aria-label="WBSタスク一覧">
            <WbsTaskTable onCreate={handleCreate} onSelect={(task) => handleSelectTask(task.wbsTaskId)} tasks={wbs.tasks} />
            <WbsGanttChart endDate={wbs.ganttEndDate} startDate={wbs.ganttStartDate} tasks={wbs.tasks} />
          </section>

          {panel.kind === "taskCreate" && (
            <WbsTaskCreatePanel
              mode={panel.taskType}
              onClose={() => setPanel({ kind: "none" })}
              projectId={project.projectId}
              tasks={wbs.tasks}
            />
          )}
          {panel.kind === "taskDetail" && selectedTask !== undefined && (
            <WbsTaskDetailPanel
              key={selectedTask.wbsTaskId}
              onClose={() => setPanel({ kind: "none" })}
              onCreateStudyLog={() => setPanel({ kind: "studyLogCreate", taskId: selectedTask.wbsTaskId })}
              onTaskNotFound={handleTaskNotFound}
              projectId={project.projectId}
              successMessage={panel.successMessage}
              task={selectedTask}
              tasks={wbs.tasks}
            />
          )}
          {panel.kind === "studyLogCreate" && selectedTask !== undefined && selectedTask.taskType === "LEAF" && (
            <StudyLogCreatePanel
              onCancel={() => setPanel({ kind: "taskDetail", taskId: selectedTask.wbsTaskId })}
              onCreated={() => handleStudyLogCreated(selectedTask.wbsTaskId)}
              projectId={project.projectId}
              taskId={selectedTask.wbsTaskId}
              taskName={selectedTask.name}
            />
          )}
        </div>
      </section>
    </main>
  );
};

type WbsPanel =
  | { kind: "none" }
  | { kind: "taskCreate"; taskType: WbsTaskType }
  | { kind: "taskDetail"; successMessage?: string; taskId: string }
  | { kind: "studyLogCreate"; taskId: string };
