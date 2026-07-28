// PJ01 プロジェクト一覧画面。プロジェクト一覧とユーザー単位学習サマリーを表示する。
import { useState } from "react";
import { Link } from "react-router-dom";

import { useCurrentAccount, useLogout } from "../features/auth/useAuth";
import { ProjectCard } from "../features/projects/ProjectCard";
import { useProjectList, useStudySummary } from "../features/projects/useProjects";
import type { ProjectListFilters, ProjectSort, ProjectStatus } from "../features/projects/projectTypes";
import { ErrorPanel } from "../shared/components/ErrorPanel";
import { LoadingPanel } from "../shared/components/LoadingPanel";
import { Panel, PanelHeader } from "../shared/components/Panel";
import { StatCard } from "../shared/components/StatCard";
import { AppHeader } from "../shared/components/AppHeader";
import { messageOf } from "../shared/api/errorMessages";
import { formatHours } from "../shared/format/formatters";

const initialFilters: ProjectListFilters = {
  keyword: "",
  status: "",
  sort: "updatedAtDesc",
  page: 0,
  size: 20,
};

export const ProjectsPage = () => {
  const accountQuery = useCurrentAccount();
  const logout = useLogout();
  const [filters, setFilters] = useState<ProjectListFilters>(initialFilters);
  const projectList = useProjectList(filters);
  const studySummary = useStudySummary();

  if (accountQuery.isLoading || accountQuery.data === undefined) {
    return <LoadingPanel message="アカウント情報を読み込んでいます。" />;
  }

  const handleKeywordChange = (keyword: string) => {
    setFilters((current) => ({ ...current, keyword, page: 0 }));
  };

  const handleStatusChange = (status: ProjectStatus | "") => {
    setFilters((current) => ({ ...current, status, page: 0 }));
  };

  const handleSortChange = (sort: ProjectSort) => {
    setFilters((current) => ({ ...current, sort, page: 0 }));
  };

  return (
    <main className="app-page">
      <AppHeader account={accountQuery.data} isLoggingOut={logout.isPending} onLogout={() => logout.mutate()} title="プロジェクト一覧" />
      <section className="summary-grid projects-summary-grid">
        {studySummary.isLoading && <LoadingPanel message="学習サマリーを読み込んでいます。" />}
        {studySummary.isError && <ErrorPanel message={messageOf(studySummary.error)} onRetry={() => studySummary.refetch()} />}
        {studySummary.data !== undefined && (
          <>
            <StatCard label="連続学習日数" value={`${studySummary.data.continuousStudyDays}日`} />
            <StatCard label="総学習時間" value={formatHours(studySummary.data.totalStudyHours)} />
            <StatCard label="進行中プロジェクト" value={`${studySummary.data.inProgressProjectCount}件`} />
          </>
        )}
      </section>

      <Panel className="project-list-panel">
        <PanelHeader
          actions={
            <Link className="primary-link" to="/projects/new">
              新規作成
            </Link>
          }
          title="プロジェクト一覧"
        />

        <div className="filter-row">
          <label>
            キーワード
            <input
              onChange={(event) => handleKeywordChange(event.target.value)}
              placeholder="名称・説明で検索"
              type="search"
              value={filters.keyword}
            />
          </label>
          <label>
            ステータス
            <select
              onChange={(event) => handleStatusChange(event.target.value as ProjectStatus | "")}
              value={filters.status}
            >
              <option value="">すべて</option>
              <option value="NOT_STARTED">未着手</option>
              <option value="IN_PROGRESS">進行中</option>
              <option value="COMPLETED">完了</option>
            </select>
          </label>
          <label>
            並び順
            <select onChange={(event) => handleSortChange(event.target.value as ProjectSort)} value={filters.sort}>
              <option value="updatedAtDesc">更新日時が新しい順</option>
              <option value="updatedAtAsc">更新日時が古い順</option>
              <option value="startDateAsc">開始日が早い順</option>
              <option value="targetEndDateAsc">目標終了日が早い順</option>
              <option value="progressRateDesc">進捗率が高い順</option>
              <option value="progressRateAsc">進捗率が低い順</option>
            </select>
          </label>
        </div>

        {projectList.isLoading && <LoadingPanel message="プロジェクト一覧を読み込んでいます。" />}
        {projectList.isError && <ErrorPanel message={messageOf(projectList.error)} onRetry={() => projectList.refetch()} />}
        {projectList.data !== undefined && (
          <>
            <section aria-label="プロジェクト一覧" className="project-list">
              {projectList.data.items.length === 0 ? (
                <p className="empty-message">条件に一致するプロジェクトはありません。</p>
              ) : (
                <>
                  <div aria-hidden="true" className="project-list-row project-list-header">
                    <span>プロジェクト</span>
                    <span>状態</span>
                    <span>期間</span>
                    <span>進捗</span>
                    <span>工数</span>
                    <span>警告</span>
                  </div>
                  {projectList.data.items.map((project) => <ProjectCard key={project.projectId} project={project} />)}
                </>
              )}
            </section>
            <p className="page-caption">
              {projectList.data.page.totalElements}件中 {projectList.data.items.length}件を表示
            </p>
          </>
        )}
      </Panel>
    </main>
  );
};
