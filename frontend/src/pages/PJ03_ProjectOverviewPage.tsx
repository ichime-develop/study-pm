// PJ03の基本情報、集計、警告、未完了タスク、プロジェクト削除を提供する。
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useCurrentAccount } from "../features/auth/useAuth";
import { ProjectDeleteModal } from "../features/projects/ProjectDeleteModal";
import { useDeleteProject, useProject, useProjectOverview } from "../features/projects/useProjects";
import { useProjectWbs } from "../features/wbs/useWbs";
import { isApiClientError } from "../shared/api/apiTypes";
import { messageOf } from "../shared/api/errorMessages";
import { AppHeader } from "../shared/components/AppHeader";
import { ProjectNav } from "../shared/components/CM02_ProjectNav";
import { ErrorPanel } from "../shared/components/ErrorPanel";
import { LoadingPanel } from "../shared/components/LoadingPanel";
import { StatCard } from "../shared/components/StatCard";
import { formatHours, formatProgressRate } from "../shared/types/formatters";

export const ProjectOverviewPage = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const accountQuery = useCurrentAccount();
  const projectQuery = useProject(projectId);
  const overviewQuery = useProjectOverview(projectId);
  const wbsQuery = useProjectWbs(projectId);
  const deleteProject = useDeleteProject(projectId ?? "");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const errors = [projectQuery.error, overviewQuery.error, wbsQuery.error];
  const isProjectNotFound = errors.some(
    (error) => isApiClientError(error) && error.status === 404,
  );
  const isLoading =
    accountQuery.isLoading ||
    projectQuery.isPending ||
    overviewQuery.isPending ||
    wbsQuery.isPending;

  const handleDelete = () => {
    deleteProject.mutate(undefined, {
      onSuccess: () => navigate("/projects"),
    });
  };

  if (isLoading) {
    return <LoadingPanel message="プロジェクト概要を読み込んでいます。" />;
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

  if (
    accountQuery.data === undefined ||
    projectQuery.data === undefined ||
    overviewQuery.data === undefined ||
    wbsQuery.data === undefined
  ) {
    const queryWithError = [accountQuery, projectQuery, overviewQuery, wbsQuery].find((query) => query.isError);
    return (
      <main className="app-page">
        <ErrorPanel
          message={messageOf(queryWithError?.error)}
          onRetry={() => {
            void accountQuery.refetch();
            void projectQuery.refetch();
            void overviewQuery.refetch();
            void wbsQuery.refetch();
          }}
        />
      </main>
    );
  }

  const project = projectQuery.data;
  const overview = overviewQuery.data;
  const hasNoWbsTasks = wbsQuery.data.tasks.length === 0;

  return (
    <main className="app-page">
      <AppHeader account={accountQuery.data} title="プロジェクト概要" />
      <ProjectNav hasNoWbsTasks={hasNoWbsTasks} project={project} />

      <section className="summary-grid overview-summary-grid">
        <StatCard label="進捗率" value={formatProgressRate(overview.progressRate)} />
        <StatCard
          label="予定 / 残予定工数"
          value={`${formatHours(overview.plannedHours)} / ${formatHours(overview.remainingPlannedHours)}`}
        />
        <StatCard label="プロジェクト学習時間" value={formatHours(overview.projectStudyHours)} />
        <StatCard label="プロジェクト連続日数" value={`${overview.projectContinuousStudyDays}日`} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">PJ03</p>
            <h2>プロジェクトの状況</h2>
          </div>
          <div className="button-row">
            <Link className="secondary-link" to={`/projects/${project.projectId}/edit`}>
              編集
            </Link>
            <button className="danger-button" onClick={() => setIsDeleteModalOpen(true)} type="button">
              削除
            </button>
          </div>
        </div>

        <OverviewWarnings warnings={overview.warnings} />
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
          <IncompleteTaskList projectId={project.projectId} tasks={overview.incompleteTasks} />
        )}
      </section>

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
  projectId: string;
  tasks: Array<{
    wbsTaskId: string;
    name: string;
    plannedEndDate: string | null;
    progressRate: number;
    hasDelay: boolean;
  }>;
};

const IncompleteTaskList = ({ projectId, tasks }: IncompleteTaskListProps) => (
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
          <Link
            className={`incomplete-task-row ${task.hasDelay ? "is-delayed" : ""}`}
            key={task.wbsTaskId}
            to={`/projects/${projectId}/wbs`}
          >
            <span>
              <strong>{task.name}</strong>
              {task.hasDelay && <small className="warning-pill">遅延</small>}
            </span>
            <span>{task.plannedEndDate ?? "-"}</span>
            <span>{formatProgressRate(task.progressRate)}</span>
          </Link>
        ))}
      </div>
    )}
  </section>
);
