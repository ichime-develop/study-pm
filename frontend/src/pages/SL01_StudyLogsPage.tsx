// SL01のプロジェクト内学習記録一覧、登録、編集、削除を提供する。
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useCurrentAccount, useLogout } from "../features/auth/useAuth";
import { ProjectPageGate } from "../features/projects/ProjectPageGate";
import { useProject } from "../features/projects/useProjects";
import { ProjectNav } from "../features/projects/ProjectNav";
import { StudyLogDeleteModal } from "../features/studyLogs/StudyLogDeleteModal";
import { StudyLogFormPanel } from "../features/studyLogs/StudyLogFormPanel";
import { StudyLogList } from "../features/studyLogs/StudyLogList";
import { useDeleteStudyLog, useProjectStudyLogs } from "../features/studyLogs/useStudyLogs";
import type { StudyLog, StudyLogListFilters } from "../features/studyLogs/studyLogTypes";
import { useProjectWbs } from "../features/wbs/useWbs";
import { isApiClientError } from "../shared/api/apiTypes";
import { AppHeader } from "../shared/components/AppHeader";
import { Panel, PanelHeader } from "../shared/components/Panel";
import { formatHours } from "../shared/format/formatters";

const initialFilters: StudyLogListFilters = {
  page: 0,
  size: 20,
  taskId: "",
};

type EditorState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; studyLog: StudyLog };

export const StudyLogsPage = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const accountQuery = useCurrentAccount();
  const logout = useLogout();
  const projectQuery = useProject(projectId);
  const wbsQuery = useProjectWbs(projectId);
  const [filters, setFilters] = useState<StudyLogListFilters>(initialFilters);
  const studyLogsQuery = useProjectStudyLogs(projectId, filters);
  const [editor, setEditor] = useState<EditorState>({ kind: "closed" });
  const [studyLogToDelete, setStudyLogToDelete] = useState<StudyLog | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const deleteStudyLog = useDeleteStudyLog(projectId ?? "");
  const projectPageError = [accountQuery, projectQuery, wbsQuery, studyLogsQuery].find((query) => query.isError)?.error;
  const isProjectNotFound = [projectQuery.error, wbsQuery.error, studyLogsQuery.error].some(
    (error) => isApiClientError(error) && error.status === 404,
  );
  const isLoading = accountQuery.isLoading || projectQuery.isPending || wbsQuery.isPending || studyLogsQuery.isPending;
  const pageData =
    accountQuery.data !== undefined &&
    projectQuery.data !== undefined &&
    wbsQuery.data !== undefined &&
    studyLogsQuery.data !== undefined
      ? {
          account: accountQuery.data,
          project: projectQuery.data,
          studyLogs: studyLogsQuery.data,
          wbs: wbsQuery.data,
        }
      : undefined;

  const handleTaskFilterChange = (taskId: string) => {
    setFilters((current) => ({ ...current, page: 0, taskId }));
  };

  const handlePageChange = (page: number) => {
    setFilters((current) => ({ ...current, page }));
  };

  const handleSaved = (message: string) => {
    setEditor({ kind: "closed" });
    setSuccessMessage(message);
  };

  const handleDelete = () => {
    if (studyLogToDelete === null) {
      return;
    }
    deleteStudyLog.mutate(studyLogToDelete.studyLogId, {
      onSuccess: () => {
        setEditor({ kind: "closed" });
        setStudyLogToDelete(null);
        setSuccessMessage("学習記録を削除しました。実績工数を更新しました。");
      },
    });
  };

  return (
    <ProjectPageGate
      data={pageData}
      error={projectPageError}
      isLoading={isLoading}
      isProjectNotFound={isProjectNotFound}
      loadingMessage="学習記録を読み込んでいます。"
      onRetry={() => {
        void accountQuery.refetch();
        void projectQuery.refetch();
        void wbsQuery.refetch();
        void studyLogsQuery.refetch();
      }}
    >
      {({ account, project, studyLogs, wbs }) => {
        const leafTasks = wbs.tasks.filter((task) => task.taskType === "LEAF");
        const hasNoLeafTasks = leafTasks.length === 0;
        const isEditorOpen = editor.kind !== "closed";
        const totalLabel = filters.taskId === "" ? "プロジェクト合計学習時間" : "絞り込み中の合計学習時間";

        return (
          <main className="app-page">
            <AppHeader account={account} isLoggingOut={logout.isPending} onLogout={() => logout.mutate()} title="学習記録" />
            <ProjectNav hasNoWbsTasks={wbs.tasks.length === 0} project={project} />

      {hasNoLeafTasks ? (
        <Panel className="state-panel">
          <PanelHeader eyebrow="SL01" title="学習記録" />
          <p>学習記録を登録するには、WBSにLEAFタスクを追加してください。</p>
          <Link className="primary-link" to={`/projects/${project.projectId}/wbs`}>
            WBSを編集する
          </Link>
        </Panel>
      ) : (
        <div className={isEditorOpen ? "study-log-workspace with-side-panel" : "study-log-workspace"}>
          <Panel>
            <PanelHeader
              actions={
                <button className="primary-button" onClick={() => setEditor({ kind: "create" })} type="button">
                  学習記録を追加
                </button>
              }
              eyebrow="SL01"
              title="学習記録"
            />

            {successMessage !== null && <p className="notice notice-success" role="status">{successMessage}</p>}

            <div className="study-log-filter">
              <label>
                対象タスク
                <select onChange={(event) => handleTaskFilterChange(event.target.value)} value={filters.taskId}>
                  <option value="">すべてのタスク</option>
                  {leafTasks.map((task) => (
                    <option key={task.wbsTaskId} value={task.wbsTaskId}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="study-log-total">
              {totalLabel}: <strong>{formatHours(studyLogs.totalStudyHours)}</strong>
            </p>
            <StudyLogList onSelect={(studyLog) => setEditor({ kind: "edit", studyLog })} studyLogs={studyLogs.studyLogs} />
            <StudyLogPagination onPageChange={handlePageChange} page={studyLogs.page} />
          </Panel>

          {editor.kind !== "closed" && (
            <StudyLogFormPanel
              leafTasks={leafTasks}
              onCancel={() => setEditor({ kind: "closed" })}
              onDelete={(studyLog) => setStudyLogToDelete(studyLog)}
              onSaved={handleSaved}
              projectId={project.projectId}
              studyLog={editor.kind === "edit" ? editor.studyLog : undefined}
            />
          )}
        </div>
      )}

            {studyLogToDelete !== null && (
        <StudyLogDeleteModal
          error={deleteStudyLog.error}
          isDeleting={deleteStudyLog.isPending}
          onCancel={() => setStudyLogToDelete(null)}
          onConfirm={handleDelete}
          studyLog={studyLogToDelete}
        />
            )}
          </main>
        );
      }}
    </ProjectPageGate>
  );
};

type StudyLogPaginationProps = {
  onPageChange: (page: number) => void;
  page: {
    page: number;
    totalPages: number;
  };
};

const StudyLogPagination = ({ onPageChange, page }: StudyLogPaginationProps) => {
  if (page.totalPages <= 1) {
    return null;
  }

  return (
    <div className="study-log-pagination">
      <button className="secondary-button" disabled={page.page === 0} onClick={() => onPageChange(page.page - 1)} type="button">
        前へ
      </button>
      <span>
        {page.page + 1} / {page.totalPages}ページ
      </span>
      <button
        className="secondary-button"
        disabled={page.page + 1 >= page.totalPages}
        onClick={() => onPageChange(page.page + 1)}
        type="button"
      >
        次へ
      </button>
    </div>
  );
};
