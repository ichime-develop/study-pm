// WB01のWBS一覧、基礎集計、親タスク・LEAFタスク作成を提供する。
import { useState } from "react";
import { useParams } from "react-router-dom";

import { useCurrentAccount, useLogout } from "../features/auth/useAuth";
import { WbsPlanWarningNotice } from "../features/analysis/WbsPlanWarningNotice";
import { canCompleteProject } from "../features/projects/projectCompletion";
import { ProjectPageGate } from "../features/projects/ProjectPageGate";
import { ProjectNav } from "../features/projects/ProjectNav";
import { useProject } from "../features/projects/useProjects";
import { WbsTaskCreatePanel } from "../features/wbs/WbsTaskCreatePanel";
import { WbsTaskDetailPanel } from "../features/wbs/WbsTaskDetailPanel";
import { WbsGanttBoard } from "../features/wbs/WbsGanttBoard";
import { useProjectWbs } from "../features/wbs/useWbs";
import type { WbsTaskType } from "../features/wbs/wbsTypes";
import { StudyLogCreatePanel } from "../features/studyLogs/StudyLogCreatePanel";
import { isApiClientError } from "../shared/api/apiTypes";
import { AppHeader } from "../shared/components/AppHeader";
import { Panel, PanelHeader } from "../shared/components/Panel";

export const WbsPage = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const accountQuery = useCurrentAccount();
  const logout = useLogout();
  const projectQuery = useProject(projectId);
  const wbsQuery = useProjectWbs(projectId);
  const [panel, setPanel] = useState<WbsPanel>({ kind: "none" });
  const projectPageError = [accountQuery, projectQuery, wbsQuery].find((query) => query.isError)?.error;
  const isProjectNotFound = [projectQuery.error, wbsQuery.error].some(
    (error) => isApiClientError(error) && error.status === 404,
  );
  const isLoading = accountQuery.isLoading || projectQuery.isPending || wbsQuery.isPending;
  const pageData =
    accountQuery.data !== undefined && projectQuery.data !== undefined && wbsQuery.data !== undefined
      ? { account: accountQuery.data, project: projectQuery.data, wbs: wbsQuery.data }
      : undefined;

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
    <ProjectPageGate
      data={pageData}
      error={projectPageError}
      isLoading={isLoading}
      isProjectNotFound={isProjectNotFound}
      loadingMessage="WBSを読み込んでいます。"
      onRetry={() => {
        void accountQuery.refetch();
        void projectQuery.refetch();
        void wbsQuery.refetch();
      }}
    >
      {({ account, project, wbs }) => {
        const hasNoWbsTasks = wbs.tasks.length === 0;
        const selectedTaskId = panel.kind === "taskDetail" || panel.kind === "studyLogCreate" ? panel.taskId : null;
        const selectedTask = wbs.tasks.find((task) => task.wbsTaskId === selectedTaskId);
        const isSidePanelOpen = panel.kind === "taskCreate" || selectedTask !== undefined;

        return (
          <main className="app-page">
            <AppHeader account={account} isLoggingOut={logout.isPending} onLogout={() => logout.mutate()} title="WBS・ガント" />
            <ProjectNav canComplete={canCompleteProject(wbs.tasks)} hasNoWbsTasks={hasNoWbsTasks} project={project} />

            <Panel>
        <PanelHeader
          actions={
            <div className="button-row">
              <button className="secondary-button" onClick={() => handleCreate("PARENT")} type="button">
                親タスクを追加
              </button>
              <button className="primary-button" onClick={() => handleCreate("LEAF")} type="button">
                タスクを追加
              </button>
            </div>
          }
          description="親タスクは見出し、LEAFタスクは予定と進捗の管理対象です。実績工数は学習記録から集計します。"
          eyebrow="WB01"
          title="WBS・ガントチャート"
        />

        <div className={isSidePanelOpen ? "wbs-workspace with-side-panel" : "wbs-workspace"}>
          <WbsGanttBoard
            endDate={wbs.ganttEndDate}
            onCreate={handleCreate}
            onSelect={(task) => handleSelectTask(task.wbsTaskId)}
            projectId={project.projectId}
            selectedTaskId={selectedTaskId}
            startDate={wbs.ganttStartDate}
            tasks={wbs.tasks}
          />

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
          <WbsPlanWarningNotice projectId={project.projectId} />
        </Panel>
      </main>
    );
      }}
    </ProjectPageGate>
  );
};

type WbsPanel =
  | { kind: "none" }
  | { kind: "taskCreate"; taskType: WbsTaskType }
  | { kind: "taskDetail"; successMessage?: string; taskId: string }
  | { kind: "studyLogCreate"; taskId: string };
