// PJ03の基本情報、集計、警告、未完了タスク、プロジェクト削除を提供する。
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useCurrentAccount, useLogout } from "../features/auth/useAuth";
import { AnalysisOverviewLink } from "../features/analysis/AnalysisOverviewLink";
import { canCompleteProject } from "../features/projects/projectCompletion";
import { ProjectDeleteModal } from "../features/projects/ProjectDeleteModal";
import { ProjectNav } from "../features/projects/ProjectNav";
import { ProjectPageGate } from "../features/projects/ProjectPageGate";
import { useDeleteProject, useProject, useProjectOverview } from "../features/projects/useProjects";
import { StudyLogCreatePanel } from "../features/studyLogs/StudyLogCreatePanel";
import { WbsTaskDetailPanel } from "../features/wbs/WbsTaskDetailPanel";
import { useProjectWbs } from "../features/wbs/useWbs";
import { isApiClientError } from "../shared/api/apiTypes";
import { AppHeader } from "../shared/components/AppHeader";
import { Panel, PanelHeader } from "../shared/components/Panel";
import { StatCard } from "../shared/components/StatCard";
import { formatHours, formatProgressRate } from "../shared/format/formatters";

export const ProjectOverviewPage = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const accountQuery = useCurrentAccount();
  const logout = useLogout();
  const projectQuery = useProject(projectId);
  const overviewQuery = useProjectOverview(projectId);
  const wbsQuery = useProjectWbs(projectId);
  const deleteProject = useDeleteProject(projectId ?? "");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"taskDetail" | "studyLogCreate">("taskDetail");
  const [taskDetailSuccessMessage, setTaskDetailSuccessMessage] = useState<string | undefined>();
  const selectedTaskId = searchParams.get("taskId");
  const selectedTask = wbsQuery.data?.tasks.find((task) => task.wbsTaskId === selectedTaskId);
  const isSelectedTaskIncomplete = overviewQuery.data?.incompleteTasks.some(
    (task) => task.wbsTaskId === selectedTaskId,
  ) ?? false;

  const clearTaskSelection = useCallback(() => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("taskId");
    setSearchParams(nextSearchParams, { replace: true });
    setPanelMode("taskDetail");
    setTaskDetailSuccessMessage(undefined);
  }, [searchParams, setSearchParams]);

  const handleSelectTask = (taskId: string) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("taskId", taskId);
    setSearchParams(nextSearchParams);
    setPanelMode("taskDetail");
    setTaskDetailSuccessMessage(undefined);
  };

  useEffect(() => {
    if (selectedTaskId !== null && wbsQuery.data !== undefined && overviewQuery.data !== undefined && !isSelectedTaskIncomplete) {
      clearTaskSelection();
    }
  }, [clearTaskSelection, isSelectedTaskIncomplete, overviewQuery.data, selectedTaskId, wbsQuery.data]);

  const projectPageError = [accountQuery, projectQuery, overviewQuery, wbsQuery].find((query) => query.isError)?.error;
  const isProjectNotFound = [projectQuery.error, overviewQuery.error, wbsQuery.error].some(
    (error) => isApiClientError(error) && error.status === 404,
  );
  const isLoading =
    accountQuery.isLoading ||
    projectQuery.isPending ||
    overviewQuery.isPending ||
    wbsQuery.isPending;
  const pageData =
    accountQuery.data !== undefined &&
    projectQuery.data !== undefined &&
    overviewQuery.data !== undefined &&
    wbsQuery.data !== undefined
      ? {
          account: accountQuery.data,
          overview: overviewQuery.data,
          project: projectQuery.data,
          wbs: wbsQuery.data,
        }
      : undefined;

  const handleDelete = () => {
    deleteProject.mutate(undefined, {
      onSuccess: () => navigate("/projects"),
    });
  };

  return (
    <ProjectPageGate
      data={pageData}
      error={projectPageError}
      isLoading={isLoading}
      isProjectNotFound={isProjectNotFound}
      loadingMessage="プロジェクト概要を読み込んでいます。"
      onRetry={() => {
        void accountQuery.refetch();
        void projectQuery.refetch();
        void overviewQuery.refetch();
        void wbsQuery.refetch();
      }}
    >
      {({ account, overview, project, wbs }) => {
        const hasNoWbsTasks = wbs.tasks.length === 0;
        const isTaskPanelOpen = selectedTask !== undefined && isSelectedTaskIncomplete;

        return (
          <main className="app-page">
            <AppHeader account={account} isLoggingOut={logout.isPending} onLogout={() => logout.mutate()} title="プロジェクト概要" />
            <ProjectNav canComplete={canCompleteProject(wbs.tasks)} hasNoWbsTasks={hasNoWbsTasks} project={project} />

      <div className={`project-overview-workspace${isTaskPanelOpen ? " with-side-panel" : ""}`}>
        <Panel className="project-overview-panel">
          <ProjectDescription
            description={project.description}
            onDelete={() => setIsDeleteModalOpen(true)}
            projectId={project.projectId}
          />

          <section className="project-overview-status">
            <PanelHeader
              eyebrow="PJ03"
              title="プロジェクトの状況"
            />

            <section className="summary-grid overview-summary-grid overview-embedded-metrics">
              <StatCard label="進捗率" value={formatProgressRate(overview.progressRate)} />
              <StatCard
                label="予定 / 残予定工数"
                value={`${formatHours(overview.plannedHours)} / ${formatHours(overview.remainingPlannedHours)}`}
              />
              <StatCard label="プロジェクト学習時間" value={formatHours(overview.projectStudyHours)} />
              <StatCard label="プロジェクト連続日数" value={`${overview.projectContinuousStudyDays}日`} />
            </section>

            <OverviewWarnings warnings={overview.warnings} />
            <AnalysisOverviewLink projectId={project.projectId} />
            {hasNoWbsTasks ? (
              <div className="empty-project-state">
                <div>
                  <h3>WBSタスクはまだありません</h3>
                  <p>予定工数と進捗率は、LEAFタスクを追加すると算出されます。</p>
                </div>
                <Link className="primary-link" to={`/projects/${project.projectId}/wbs`}>
                  WBSを作成する
                </Link>
              </div>
            ) : (
              <IncompleteTaskList
                onSelectTask={handleSelectTask}
                projectId={project.projectId}
                selectedTaskId={selectedTaskId}
                tasks={overview.incompleteTasks}
              />
            )}
          </section>
        </Panel>
        {isTaskPanelOpen && panelMode === "taskDetail" && (
          <WbsTaskDetailPanel
            key={selectedTask.wbsTaskId}
            onClose={clearTaskSelection}
            onCreateStudyLog={() => setPanelMode("studyLogCreate")}
            onTaskNotFound={clearTaskSelection}
            projectId={project.projectId}
            successMessage={taskDetailSuccessMessage}
            task={selectedTask}
            tasks={wbs.tasks}
          />
        )}
        {isTaskPanelOpen && panelMode === "studyLogCreate" && selectedTask.taskType === "LEAF" && (
          <StudyLogCreatePanel
            onCancel={() => setPanelMode("taskDetail")}
            onCreated={() => {
              setPanelMode("taskDetail");
              setTaskDetailSuccessMessage("学習記録を登録しました。実績工数を更新しました。");
            }}
            projectId={project.projectId}
            taskId={selectedTask.wbsTaskId}
            taskName={selectedTask.name}
          />
        )}
      </div>

            {isDeleteModalOpen && (
        <ProjectDeleteModal
          error={deleteProject.error}
          isDeleting={deleteProject.isPending}
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          projectName={project.name}
        />
            )}
          </main>
        );
      }}
    </ProjectPageGate>
  );
};

type ProjectDescriptionProps = {
  description: string | null;
  onDelete: () => void;
  projectId: string;
};

const ProjectDescription = ({ description, onDelete, projectId }: ProjectDescriptionProps) => {
  const hasDescription = description !== null && description.trim().length > 0;

  return (
    <section className="project-description" aria-labelledby="project-description-title">
      <div className="project-description-header">
        <h2 id="project-description-title">プロジェクトについて</h2>
        <div className="button-row">
          <Link className="secondary-link" to={`/projects/${projectId}/edit`}>
            プロジェクトを編集
          </Link>
          <button className="danger-button" onClick={onDelete} type="button">
            プロジェクトを削除
          </button>
        </div>
      </div>
      <p className={hasDescription ? "project-description-content" : "project-description-content is-empty"}>
        {hasDescription ? description : "説明は未設定です。"}
      </p>
    </section>
  );
};

type OverviewWarningsProps = {
  warnings: Array<{ code: string; message: string }>;
};

const OverviewWarnings = ({ warnings }: OverviewWarningsProps) => (
  <section className="overview-section" aria-labelledby="overview-warnings-title">
    <h3 id="overview-warnings-title">警告</h3>
    <div className="warning-list">
      {warnings.length === 0 ? (
        <p className="notice notice-success">進捗遅延、工数超過はありません。</p>
      ) : (
        warnings.map((warning) => (
          <p className="notice notice-warning" key={warning.code}>
            {warning.message}
          </p>
        ))
      )}
    </div>
  </section>
);

type IncompleteTaskListProps = {
  onSelectTask: (taskId: string) => void;
  projectId: string;
  selectedTaskId: string | null;
  tasks: Array<{
    wbsTaskId: string;
    name: string;
    plannedEndDate: string | null;
    progressRate: number;
    hasDelay: boolean;
  }>;
};

const IncompleteTaskList = ({ onSelectTask, projectId, selectedTaskId, tasks }: IncompleteTaskListProps) => (
  <section className="overview-section" aria-labelledby="incomplete-tasks-title">
    <div className="panel-header">
      <h3 id="incomplete-tasks-title">未完了タスク</h3>
      <Link className="secondary-link" to={`/projects/${projectId}/wbs`}>
        WBSで確認
      </Link>
    </div>
    {tasks.length === 0 ? (
      <p className="empty-message">未完了タスクはありません。</p>
    ) : (
      <div className="incomplete-task-list">
        <div className="incomplete-task-row incomplete-task-header">
          <span>タスク</span>
          <span>終了予定日</span>
          <span>進捗率</span>
        </div>
        {tasks.map((task) => (
          <button
            aria-label={`${task.name}の詳細を開く`}
            aria-pressed={selectedTaskId === task.wbsTaskId}
            className={`incomplete-task-row incomplete-task-select${task.hasDelay ? " is-delayed" : ""}${selectedTaskId === task.wbsTaskId ? " is-selected" : ""}`}
            key={task.wbsTaskId}
            onClick={() => onSelectTask(task.wbsTaskId)}
            type="button"
          >
            <span>
              <strong className="incomplete-task-name">{task.name}</strong>
              {task.hasDelay && <small className="warning-pill">遅延</small>}
            </span>
            <span>{task.plannedEndDate ?? "-"}</span>
            <span>{formatProgressRate(task.progressRate)}</span>
          </button>
        ))}
      </div>
    )}
  </section>
);
