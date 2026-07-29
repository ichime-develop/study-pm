import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  aiPlanTasks,
  manualProject,
  projects,
  studyLogs,
  tasks,
  today,
  tocSampleText,
  type AiPlanTask,
  type Project,
  type StudyLog,
  type TaskStatus,
  type WbsTask,
} from "./data/mockData";
import {
  buildProjectSummary,
  buildTaskSummary,
  formatDate,
  formatHours,
  formatProgress,
  getLeafTasks,
  getStatusLabel,
  getTaskLevel,
} from "./domain/calculations";

type Screen =
  | "login"
  | "signup"
  | "projects"
  | "projectDetail"
  | "progressAnalysis"
  | "projectForm"
  | "wbs"
  | "studyLogs"
  | "aiPlanMethod"
  | "aiPlanInput"
  | "aiPlanDraft";

const screenLabels: Record<Screen, string> = {
  login: "ログイン",
  signup: "アカウント登録",
  projects: "プロジェクト一覧",
  projectDetail: "プロジェクト概要",
  progressAnalysis: "進捗分析",
  projectForm: "プロジェクトを手動で作成",
  wbs: "WBS・ガント",
  studyLogs: "学習記録",
  aiPlanMethod: "AI作成① 方法選択",
  aiPlanInput: "AI作成② 条件・教材入力",
  aiPlanDraft: "AI作成③ WBS下書き",
};

const commonScreens: Screen[] = [
  "projects",
  "projectForm",
  "aiPlanMethod",
  "aiPlanInput",
  "aiPlanDraft",
  "login",
  "signup",
];
const projectScreens: Screen[] = [
  "projectDetail",
  "wbs",
  "studyLogs",
  "progressAnalysis",
];

const ProjectStatusUpdateContext = createContext<(projectId: string, status: Project["status"]) => void>(() => undefined);

export const App = () => {
  const [screen, setScreen] = useState<Screen>("projects");
  const [aiPlanMode, setAiPlanMode] = useState<"simple" | "toc">("simple");
  const [selectedProjectId, setSelectedProjectId] = useState("java-silver");
  const [manualProjectCreated, setManualProjectCreated] = useState(false);
  const [projectStatuses, setProjectStatuses] = useState<Partial<Record<string, Project["status"]>>>({});
  const sourceProjects = manualProjectCreated ? [...projects, manualProject] : projects;
  const allProjects = sourceProjects.map((project) => ({
    ...project,
    status: projectStatuses[project.id] ?? project.status,
  }));
  const selectedProject = allProjects.find((project) => project.id === selectedProjectId) ?? projects[0];

  const visibleProjects = [...allProjects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const openProject = (projectId: string, nextScreen: Screen = "projectDetail") => {
    setSelectedProjectId(projectId);
    setScreen(nextScreen);
  };

  const updateProjectStatus = (projectId: string, status: Project["status"]) => {
    setProjectStatuses((current) => ({ ...current, [projectId]: status }));
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">SP</span>
          <div>
            <strong>Study PM</strong>
            <span>PC Web Mock</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="画面切り替え">
          <div className="nav-section">
            <span className="nav-section-title">共通</span>
            {commonScreens.map((key) => (
              <button
                className={screen === key ? "nav-item active" : "nav-item"}
                key={key}
                onClick={() => setScreen(key)}
                type="button"
              >
                {screenLabels[key]}
              </button>
            ))}
          </div>
          <div className="nav-section">
            <span className="nav-section-title">選択中: {selectedProject.name}</span>
            {projectScreens.map((key) => (
              <button
                className={screen === key ? "nav-item active" : "nav-item"}
                key={key}
                onClick={() => setScreen(key)}
                type="button"
              >
                {screenLabels[key]}
              </button>
            ))}
          </div>
        </nav>
        <div className="mock-note">
          <strong>要件検証用</strong>
          <p>API接続なし。固定データでPC Web版の画面導線を確認します。</p>
        </div>
      </aside>

      <ProjectStatusUpdateContext.Provider value={updateProjectStatus}>
        <main className="main-content">
          <header className="topbar">
            <div>
              <p className="eyebrow">PC Web UIモック</p>
              <h1>{screenLabels[screen]}</h1>
            </div>
            <div className="topbar-actions">
              <button className="secondary-button" onClick={() => setScreen("login")} type="button">
                ログアウト例
              </button>
            </div>
          </header>

          {screen === "login" && <LoginScreen onMove={setScreen} />}
          {screen === "signup" && <SignupScreen onMove={setScreen} />}
          {screen === "projects" && (
            <ProjectList projects={visibleProjects} onMove={setScreen} onOpenProject={openProject} />
          )}
          {screen === "projectDetail" && (
            <ProjectOverview project={selectedProject} onMove={setScreen} />
          )}
          {screen === "progressAnalysis" && <ProgressAnalysis project={selectedProject} onMove={setScreen} />}
          {screen === "projectForm" && (
            <ProjectForm
              onCancel={() => setScreen("projects")}
              onCreate={() => {
                setManualProjectCreated(true);
                setSelectedProjectId(manualProject.id);
                setScreen("projectDetail");
              }}
            />
          )}
          {screen === "wbs" && <WbsEditor project={selectedProject} onMove={setScreen} />}
          {screen === "studyLogs" && <StudyLogList project={selectedProject} onMove={setScreen} />}
          {screen === "aiPlanMethod" && (
            <AiPlanMethod
              onBack={() => setScreen("projects")}
              onSelect={(mode) => {
                setAiPlanMode(mode);
                setScreen("aiPlanInput");
              }}
            />
          )}
          {screen === "aiPlanInput" && <AiPlanInput mode={aiPlanMode} onMove={setScreen} />}
          {screen === "aiPlanDraft" && <AiPlanDraft onMove={setScreen} />}
        </main>
      </ProjectStatusUpdateContext.Provider>
    </div>
  );
};

const LoginScreen = ({ onMove }: { onMove: (screen: Screen) => void }) => (
  <section className="auth-layout">
    <div className="auth-hero">
      <p className="eyebrow">AU02</p>
      <h2>学習をプロジェクトとして管理する</h2>
      <p>
        資格取得・スキルアップの学習を、仕事と同じ感覚でプロジェクト管理。
        計画から振り返りまで一元管理できます。
      </p>
      <ul className="hero-feature-list">
        <li>
          <span className="hero-feature-icon">📋</span>
          <div>
            <strong>WBSで学習を構造化</strong>
            <span>大項目・小項目に分けて進捗を見える化</span>
          </div>
        </li>
        <li>
          <span className="hero-feature-icon">📈</span>
          <div>
            <strong>進捗分析・バーンダウン</strong>
            <span>学習ペースと遅延をグラフで把握</span>
          </div>
        </li>
        <li>
          <span className="hero-feature-icon">🤖</span>
          <div>
            <strong>AIが学習計画を自動作成</strong>
            <span>目標と期限からWBSをワンクリック生成</span>
          </div>
        </li>
        <li>
          <span className="hero-feature-icon">📝</span>
          <div>
            <strong>学習記録を積み上げる</strong>
            <span>日々の記録が進捗に自動反映</span>
          </div>
        </li>
      </ul>
      <div className="auth-preview">
        <Metric label="進行中" value="1件" />
        <Metric label="遅延" value="0件" />
        <Metric label="完了タスク" value="8件" />
      </div>
    </div>
    <div className="panel form-panel auth-card">
      <div>
        <h2>ログイン</h2>
        <p>認証処理は行わないモックです。入力項目とエラーメッセージの位置を確認します。</p>
      </div>
      <label>
        メールアドレス
        <input type="email" defaultValue="ichikawa@example.com" />
      </label>
      <label>
        パスワード
        <input type="password" defaultValue="Password1" />
      </label>
      <div className="error-preview">
        メールアドレスまたはパスワードが正しくありません。
      </div>
      <button className="primary-button" onClick={() => onMove("projects")} type="button">
        ログイン
      </button>
      <button className="text-button align-left" onClick={() => onMove("signup")} type="button">
        アカウントを作成する
      </button>
      <p className="helper-text">パスワード再設定とメール認証はMVP対象外です。</p>
    </div>
  </section>
);

const SignupScreen = ({ onMove }: { onMove: (screen: Screen) => void }) => (
  <section className="auth-layout">
    <div className="auth-hero">
      <p className="eyebrow">AU01</p>
      <h2>アカウント登録</h2>
      <p>
        MVPではメールアドレスとパスワードのみで登録します。メール認証と
        パスワード再設定は対象外です。
      </p>
      <ul className="check-list light">
        <li>メールアドレスは大文字小文字を区別せず一意</li>
        <li>パスワードは8文字以上</li>
        <li>英大文字、英小文字、数字を各1文字以上含む</li>
      </ul>
    </div>
    <div className="panel form-panel auth-card">
      <div>
        <h2>新規登録</h2>
        <p>パスワード要件がユーザーに伝わるかを確認します。</p>
      </div>
      <label>
        表示名
        <input defaultValue="Ichikawa" maxLength={100} />
      </label>
      <label>
        メールアドレス
        <input type="email" defaultValue="ichikawa@example.com" />
      </label>
      <label>
        パスワード
        <input type="password" defaultValue="Password1" />
      </label>
      <label>
        パスワード確認
        <input type="password" defaultValue="Password1" />
      </label>
      <div className="password-rule">
        <span className="rule-ok">8文字以上</span>
        <span className="rule-ok">英大文字</span>
        <span className="rule-ok">英小文字</span>
        <span className="rule-ok">数字</span>
      </div>
      <button className="primary-button" onClick={() => onMove("projects")} type="button">
        登録して開始
      </button>
      <button className="text-button align-left" onClick={() => onMove("login")} type="button">
        ログインへ戻る
      </button>
    </div>
  </section>
);

const ProjectList = ({
  projects: list,
  onMove,
  onOpenProject,
}: {
  projects: Project[];
  onMove: (screen: Screen) => void;
  onOpenProject: (projectId: string, screen?: Screen) => void;
}) => {
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const totalStudyHours = studyLogs.reduce((sum, log) => sum + log.hours, 0);
  const continuousStudyDays = getContinuousStudyDays(studyLogs.map((log) => log.studyDate), today);

  return (
    <section className="screen-grid">
      <div className="metric-row home-summary">
        <Metric label="連続学習日数" value={`${continuousStudyDays}日`} tone={continuousStudyDays > 0 ? "good" : "normal"} />
        <Metric label="総学習時間" value={formatHours(totalStudyHours)} />
        <Metric label="進行中プロジェクト" value={`${list.filter((project) => project.status === "in_progress").length}件`} />
      </div>

      <section className="panel wide">
      <div className="panel-header">
        <div>
          <h2>プロジェクト一覧</h2>
        </div>
        <div className="create-action">
          <button
            aria-expanded={showCreateOptions}
            aria-haspopup="dialog"
            className="primary-button"
            onClick={() => setShowCreateOptions((current) => !current)}
            type="button"
          >
            新規作成
          </button>
          {showCreateOptions && (
            <div className="create-menu" aria-label="プロジェクト作成方法" role="dialog">
              <div className="create-menu-header">
                <strong>作成方法を選択</strong>
                <span>手動で作るか、AIと計画案を作るかを選びます。</span>
              </div>
              <button className="create-menu-item" onClick={() => onMove("aiPlanMethod")} type="button">
                AIと作成
              </button>
              <button className="create-menu-item" onClick={() => onMove("projectForm")} type="button">
                手動で作成
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="data-list project-list">
        {list.length > 0 && (
          <div className="data-list-row data-list-head project-list-row">
            <span>プロジェクト</span>
            <span>状態</span>
            <span>期間</span>
            <span>進捗</span>
            <span>工数</span>
            <span>警告</span>
          </div>
        )}
        {list.map((project) => {
          const summary = buildProjectSummary(project, tasks, studyLogs);
          return (
            <button className="data-list-row project-list-row clickable" key={project.id} onClick={() => onOpenProject(project.id)} type="button">
              <span>
                <strong>{project.name}</strong>
              </span>
              <span><StatusPill status={project.status} /></span>
              <span>{formatDate(project.startDate)} - {formatDate(project.targetEndDate)}</span>
              <span><ProgressBar value={summary.progress} /></span>
              <span>{formatHours(summary.actualHours)} / {formatHours(summary.plannedHours)}</span>
              <span>{summary.delayedCount > 0 ? `${summary.delayedCount}件遅延` : "なし"}</span>
            </button>
          );
        })}
        {list.length === 0 && (
          <div className="empty-state">プロジェクトはまだありません。</div>
        )}
      </div>
      </section>
    </section>
  );
};

const ProjectOverview = ({ project, onMove }: { project: Project; onMove: (screen: Screen) => void }) => {
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [studyLogTaskId, setStudyLogTaskId] = useState<string | null>(null);
  const summary = buildProjectSummary(project, tasks, studyLogs);
  const projectLogs = studyLogs.filter((log) => log.projectId === project.id);
  const projectContinuousDays = getContinuousStudyDays(projectLogs.map((log) => log.studyDate), today);
  const earnedValue = (summary.plannedHours * summary.progress) / 100;
  const remainingHours = Math.max(summary.plannedHours - earnedValue, 0);
  const incompleteTasks = getLeafTasks(project.id, tasks)
    .map((task) => ({
      task,
      summary: buildTaskSummary(task, project, tasks, studyLogs),
    }))
    .filter((item) => item.summary.progress < 100)
    .sort((a, b) => {
      if (a.summary.isDelayed !== b.summary.isDelayed) {
        return a.summary.isDelayed ? -1 : 1;
      }
      return a.summary.plannedEndDate.localeCompare(b.summary.plannedEndDate);
    });
  const hasCostOverrun = summary.actualHours > summary.plannedHours && summary.plannedHours > 0;
  const delayedTasks = incompleteTasks.filter((item) => item.summary.isDelayed);
  const selectedTask = projectTasks.find((task) => task.id === selectedTaskId) ?? null;

  if (projectTasks.length === 0) {
    return <EmptyProjectOverview project={project} onMove={onMove} />;
  }

  return (
    <section className="screen-grid project-detail-grid">
      <ProjectWorkspaceHeader active="projectDetail" hasNoTasks={false} onMove={onMove} project={project} />

      <div className={selectedTask ? "project-overview-workspace with-side-panel" : "project-overview-workspace"}>
        <section className="panel project-overview-panel">
          <ProjectReadmePanel onEdit={() => onMove("projectForm")} project={project} />

          <section className="project-overview-status" aria-labelledby="project-status-title">
            <div className="panel-header">
              <div>
                <p className="eyebrow">PJ03</p>
                <h2 id="project-status-title">プロジェクトの状況</h2>
              </div>
            </div>

            <div className="metric-row compact-metrics">
              <Metric label="進捗率" value={formatProgress(summary.progress)} />
              <Metric
                label="予定 / 残工数"
                value={`${formatHours(summary.plannedHours)} / ${formatHours(remainingHours)}`}
                tone={hasCostOverrun ? "danger" : "normal"}
              />
              <Metric label="プロジェクト学習時間" value={formatHours(summary.actualHours)} />
              <Metric label="プロジェクト連続日数" value={`${projectContinuousDays}日`} tone={projectContinuousDays > 0 ? "good" : "normal"} />
            </div>

            <section className="project-overview-section" aria-labelledby="project-warning-title">
              <h3 id="project-warning-title">警告</h3>
              <div className="warning-banner-list">
                {delayedTasks.length > 0 && (
                  <div className="warning-banner danger">
                    <strong>進捗遅延</strong>
                    <span>{delayedTasks.length}件のタスクが終了予定日を過ぎています。</span>
                  </div>
                )}
                {hasCostOverrun && (
                  <div className="warning-banner danger">
                    <strong>工数超過</strong>
                    <span>実績工数が予定工数を超えています。</span>
                  </div>
                )}
                {delayedTasks.length === 0 && !hasCostOverrun && (
                  <div className="warning-banner good">
                    <strong>警告なし</strong>
                    <span>進捗遅延、工数超過はありません。</span>
                  </div>
                )}
              </div>
            </section>

            <section className="project-overview-section" aria-labelledby="incomplete-task-title">
              <div className="panel-header">
                <h3 id="incomplete-task-title">未完了タスク</h3>
                <button className="text-button" onClick={() => onMove("wbs")} type="button">
                  WBSで確認
                </button>
              </div>
              <div className="data-list incomplete-task-list">
                {incompleteTasks.length > 0 && (
                  <div className="data-list-row data-list-head incomplete-task-row">
                    <span>タスク</span>
                    <span>終了予定</span>
                    <span>進捗</span>
                  </div>
                )}
                {incompleteTasks.slice(0, 8).map(({ task, summary: taskSummary }) => (
                  <button
                    className={taskSummary.isDelayed ? "data-list-row incomplete-task-row clickable delayed" : "data-list-row incomplete-task-row clickable"}
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    type="button"
                  >
                    <span>
                      <strong>{task.name}</strong>
                      {taskSummary.isDelayed && <span className="badge warning">遅延</span>}
                    </span>
                    <span>{formatDate(taskSummary.plannedEndDate)}</span>
                    <span>{formatProgress(taskSummary.progress)}</span>
                  </button>
                ))}
                {incompleteTasks.length === 0 && (
                  <div className="empty-state">未完了タスクはありません。</div>
                )}
              </div>
            </section>
          </section>
        </section>

        {selectedTask && (studyLogTaskId === selectedTask.id ? (
          <StudyLogEditorPanel
            initialTaskId={selectedTask.id}
            onCancel={() => setStudyLogTaskId(null)}
            onSave={() => setStudyLogTaskId(null)}
            taskList={projectTasks}
          />
        ) : (
          <TaskSidePanel
            onAddStudyLog={setStudyLogTaskId}
            onClose={() => setSelectedTaskId(null)}
            project={project}
            task={selectedTask}
            taskList={projectTasks}
          />
        ))}
      </div>

    </section>
  );
};

const EmptyProjectOverview = ({
  project,
  onMove,
}: {
  project: Project;
  onMove: (screen: Screen) => void;
}) => (
  <section className="screen-grid project-detail-grid">
    <ProjectWorkspaceHeader active="projectDetail" hasNoTasks={true} onMove={onMove} project={project} />

    <section className="panel wide project-overview-panel">
      <ProjectReadmePanel onEdit={() => onMove("projectForm")} project={project} />

      <section className="project-overview-status" aria-labelledby="project-status-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">PJ03</p>
            <h2 id="project-status-title">プロジェクトの状況</h2>
          </div>
        </div>
        <div className="metric-row compact-metrics">
          <Metric label="進捗率" value="-" />
          <Metric label="予定 / 実績" value="- / 0h" />
          <Metric label="WBSタスク" value="0件" />
          <Metric label="プロジェクト状態" value={getStatusLabel(project.status)} />
        </div>
        <section className="empty-project-onboarding">
          <div className="empty-project-copy">
            <span className="empty-project-icon">WBS</span>
            <div>
              <p className="eyebrow">次に行うこと</p>
              <h2>学習内容をWBSへ分解する</h2>
              <p>
                プロジェクトは作成されました。最初に章や学習テーマを親タスクとして登録し、
                その配下へ実際に学習するタスクを追加します。
              </p>
            </div>
          </div>
          <button className="primary-button" onClick={() => onMove("wbs")} type="button">
            WBSを作成する
          </button>
        </section>
      </section>
    </section>

    <section className="panel wide">
      <div className="panel-header">
        <div>
          <h2>手動作成の進め方</h2>
          <p>学習範囲を大きなまとまりから具体的な作業へ分解します。</p>
        </div>
      </div>
      <div className="wbs-start-guide">
        <article>
          <span>1</span>
          <strong>親タスクを作る</strong>
          <p>章、単元、学習テーマなどの見出しを登録します。</p>
        </article>
        <article>
          <span>2</span>
          <strong>タスクを追加する</strong>
          <p>読む、問題を解く、復習するなどの作業へ分けます。</p>
        </article>
        <article>
          <span>3</span>
          <strong>予定を入力する</strong>
          <p>予定開始日、予定終了日、予定工数を設定します。</p>
        </article>
      </div>
    </section>
  </section>
);

const ProjectReadmePanel = ({ onEdit, project }: { onEdit: () => void; project: Project }) => {
  const hasSummary = project.summary.trim().length > 0;

  return (
    <section className="project-readme-panel" aria-labelledby="project-readme-title">
      <div className="panel-header">
        <h2 id="project-readme-title">プロジェクトについて</h2>
        <div className="project-readme-actions">
          <button className="secondary-button" onClick={onEdit} type="button">プロジェクトを編集</button>
          <button className="danger-button" onClick={() => window.confirm("このプロジェクトを削除しますか？")} type="button">プロジェクトを削除</button>
        </div>
      </div>
      <p className={hasSummary ? "project-readme-copy" : "project-readme-copy is-empty"}>
        {hasSummary ? project.summary : "説明は未設定です。"}
      </p>
    </section>
  );
};

const projectTabItems: Array<{
  label: string;
  screen: Screen;
  mvp: 1 | 2 | 3;
}> = [
  { label: "概要", screen: "projectDetail", mvp: 1 },
  { label: "WBS", screen: "wbs", mvp: 1 },
  { label: "学習記録", screen: "studyLogs", mvp: 1 },
  { label: "進捗分析", screen: "progressAnalysis", mvp: 2 },
];

const ProjectSectionTabs = ({
  active,
  hasNoTasks,
  onMove,
}: {
  active: Screen;
  hasNoTasks: boolean;
  onMove: (screen: Screen) => void;
}) => (
  <nav className="project-tabs" aria-label="プロジェクト内機能">
    {projectTabItems.map((tab) => {
      const isActive = active === tab.screen;
      const isMvpDisabled = tab.mvp !== 1 && !isActive;
      const isTaskDisabled = hasNoTasks && (tab.screen === "studyLogs") && !isActive;
      const isDisabled = isMvpDisabled || isTaskDisabled;

      return (
        <button
          aria-current={isActive ? "page" : undefined}
          className={[
            "project-tab",
            isActive ? "active" : "",
            isDisabled ? "disabled" : "",
          ].filter(Boolean).join(" ")}
          disabled={isDisabled}
          key={tab.screen}
          onClick={() => onMove(tab.screen)}
          title={isMvpDisabled ? `MVP ${tab.mvp} で提供予定` : isTaskDisabled ? "WBSにタスクを追加すると利用できます" : undefined}
          type="button"
        >
          <span>{tab.label}</span>
          <small>MVP {tab.mvp}</small>
        </button>
      );
    })}
  </nav>
);

const ProjectWorkspaceHeader = ({
  active,
  hasNoTasks,
  onMove,
  project,
}: {
  active: Screen;
  hasNoTasks: boolean;
  onMove: (screen: Screen) => void;
  project: Project;
}) => {
  const updateProjectStatus = useContext(ProjectStatusUpdateContext);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const leafTasks = getLeafTasks(project.id, tasks);
  const canComplete = leafTasks.length > 0 && leafTasks.every((task) => task.progress === 100);

  return (
    <>
      <header className="project-workspace-header">
        <div className="project-workspace-identity">
          <div className="project-workspace-copy">
            <div className="project-workspace-name-row">
              <h2>{project.name}</h2>
              <button
                aria-label={`プロジェクトの状態を変更。現在: ${getStatusLabel(project.status)}`}
                className={`status-pill ${project.status} status-change-button`}
                onClick={() => setIsStatusDialogOpen(true)}
                type="button"
              >
                {getStatusLabel(project.status)} <span aria-hidden="true">▾</span>
              </button>
            </div>
          </div>
          <div className="project-workspace-meta" aria-label="プロジェクト期間">
            <span>{formatDate(project.startDate)} - {formatDate(project.targetEndDate)}</span>
          </div>
        </div>
        <ProjectSectionTabs active={active} hasNoTasks={hasNoTasks} onMove={onMove} />
      </header>
      {isStatusDialogOpen && (
        <ProjectStatusDialog
          canComplete={canComplete}
          onCancel={() => setIsStatusDialogOpen(false)}
          onConfirm={(status) => {
            updateProjectStatus(project.id, status);
            setIsStatusDialogOpen(false);
          }}
          project={project}
        />
      )}
    </>
  );
};

const ProjectStatusDialog = ({
  canComplete,
  onCancel,
  onConfirm,
  project,
}: {
  canComplete: boolean;
  onCancel: () => void;
  onConfirm: (status: Project["status"]) => void;
  project: Project;
}) => {
  const [status, setStatus] = useState(project.status);

  return (
    <div className="status-modal-backdrop" role="presentation">
      <section aria-labelledby="project-status-dialog-title" aria-modal="true" className="status-modal" role="dialog">
        <p className="eyebrow">プロジェクトの状態</p>
        <h2 id="project-status-dialog-title">「{project.name}」の状態を変更</h2>
        <fieldset>
          <legend>状態</legend>
          <div className="status-option-list">
            {(["not_started", "in_progress", "completed"] as const).map((option) => {
              const isDisabled = option === "completed" && !canComplete;

              return (
                <label className={isDisabled ? "is-disabled" : undefined} key={option}>
                  <input
                    checked={status === option}
                    disabled={isDisabled}
                    name="project-status"
                    onChange={() => setStatus(option)}
                    type="radio"
                    value={option}
                  />
                  {getStatusLabel(option)}
                </label>
              );
            })}
          </div>
        </fieldset>
        {!canComplete && (
          <p className="form-helper">完了にするには、LEAFタスクを1件以上作成し、すべての進捗率を100%にしてください。</p>
        )}
        <div className="button-group">
          <button className="secondary-button" onClick={onCancel} type="button">キャンセル</button>
          <button className="primary-button" disabled={status === project.status} onClick={() => onConfirm(status)} type="button">
            変更を保存
          </button>
        </div>
      </section>
    </div>
  );
};

type CreationFlowStep = {
  label: string;
  state?: "active" | "done";
};

const CreationFlowHeader = ({
  badge,
  description,
  steps,
  title,
}: {
  badge?: string;
  description: string;
  steps?: CreationFlowStep[];
  title: string;
}) => (
  <header className="flow-header">
    {steps && (
      <div
        className={[
          "stepper",
          steps.length === 2 ? "two-steps" : "",
          steps.length === 4 ? "four-steps" : "",
        ].filter(Boolean).join(" ")}
      >
        {steps.map((step) => (
          <span className={["step-item", step.state ?? ""].filter(Boolean).join(" ")} key={step.label}>
            {step.label}
          </span>
        ))}
      </div>
    )}
    <div className="flow-header-body">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {badge && <span className="badge neutral">{badge}</span>}
    </div>
  </header>
);

const ProgressAnalysis = ({ project, onMove }: { project: Project; onMove: (screen: Screen) => void }) => {
  return (
    <section className="screen-grid">
      <ProjectWorkspaceHeader active="progressAnalysis" hasNoTasks={tasks.filter(t => t.projectId === project.id).length === 0} onMove={onMove} project={project} />

      <section className="panel wide">
        <div className="panel-header">
          <h2>EVM・バーンダウン</h2>
        </div>
        <EvmPanel onMove={onMove} project={project} />
      </section>

      <section className="panel wide">
        <div className="panel-header">
          <h2>計画不整合</h2>
        </div>
        <PlanWarningPanel project={project} />
      </section>
    </section>
  );
};

const dayWidth = 42;
const dayMs = 24 * 60 * 60 * 1000;

const toDate = (value: string) => new Date(`${value}T00:00:00+09:00`);

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getInclusiveDays = (start: string, end: string) =>
  Math.max(1, Math.round((toDate(end).getTime() - toDate(start).getTime()) / dayMs) + 1);

const formatHourNumber = (value: number) =>
  Number.isInteger(value) ? `${value}` : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");

const formatIntegerProgress = (value: number) => `${Math.round(value)}%`;

type HourField = "planned";

const isWorkTask = (task: WbsTask, allTasks: WbsTask[]) =>
  !allTasks.some((candidate) => candidate.parentId === task.id);

const getContinuousStudyDays = (studyDates: string[], baseDate: string) => {
  const studiedDateSet = new Set(studyDates);
  const base = toDate(baseDate);
  const startDate = studiedDateSet.has(baseDate)
    ? base
    : new Date(base.getTime() - dayMs);

  if (!studiedDateSet.has(toDateInputValue(startDate))) {
    return 0;
  }

  let count = 0;
  let currentDate = startDate;

  while (studiedDateSet.has(toDateInputValue(currentDate))) {
    count += 1;
    currentDate = new Date(currentDate.getTime() - dayMs);
  }

  return count;
};

const svHelp = [
  "Schedule Variance。予定との差分を時間で表します。",
  "計算式: SV = EV - PV",
  "SV < 0: 予定より遅れています。",
  "SV > 0: 予定より先行しています。",
  "SV = 0: 予定どおりです。",
  "画面では状態ラベルを付けず、符号付き時間数で表示します。",
];

const evmHelp: Record<string, string[]> = {
  BAC: [
    "Budget at Completion。プロジェクト全体の予定工数です。",
    "計算式: 親タスクを除く全タスクの予定工数合計",
    "最終的に必要と見積もった学習時間を表します。",
  ],
  PV: [
    "Planned Value。基準日までに完了している予定だった作業量です。",
    "計算式: 予定工数を予定期間へ日割り配分し、基準日までを合計",
    "PVがEVより大きい場合、計画より遅れている可能性があります。",
  ],
  EV: [
    "Earned Value。進捗率から見た完了済み作業量です。",
    "計算式: 予定工数 × 進捗率",
    "実際に使った時間ではなく、完了したとみなす予定工数です。",
  ],
  AC: [
    "Actual Cost。本アプリでは実績工数です。",
    "計算式: 基準日までに記録された学習記録の学習時間合計",
    "学習に実際に使った時間を表します。",
  ],
  CV: [
    "Cost Variance。予定工数に対する効率差を時間で表します。",
    "計算式: CV = EV - AC",
    "CV < 0: 予定より時間を使っています。",
    "CV > 0: 予定より少ない時間で進んでいます。",
    "画面では状態ラベルを付けず、符号付き時間数で表示します。",
  ],
  SPI: [
    "Schedule Performance Index。スケジュール効率です。",
    "計算式: SPI = EV / PV",
    "SPI < 1: 予定より遅れています。",
    "SPI >= 1: 状態ラベルは表示しません。",
  ],
  CPI: [
    "Cost Performance Index。本アプリでは工数効率です。",
    "計算式: CPI = EV / AC",
    "CPI < 1: 予定より時間を使っています。",
    "CPI >= 1: 状態ラベルは表示しません。",
  ],
};

const burndownHelp = [
  "残予定工数の減り方を日付ごとに確認するグラフです。",
  "理想線: プロジェクト開始日から目標終了日まで、BACが0へ減る想定線",
  "実績線: BACから日ごとのEVを差し引いた残量",
  "実績線が理想線より上にある場合、消化が遅い可能性があります。",
];

type MetricTone = "normal" | "good" | "warning" | "danger";
type BurndownEvaluation = {
  tone: MetricTone;
  message: string;
  help: string[];
};

const getIndexEvaluation = (
  value: number | null,
  negativeLabel: string,
): { tone: MetricTone; statusLabel?: string } => {
  if (value === null) return { tone: "normal" };
  if (value >= 1) return { tone: "good" };
  return { tone: "danger", statusLabel: negativeLabel };
};

const formatSignedHours = (value: number | null) => {
  if (value === null) return "-";
  const absoluteValue = Math.abs(value);
  const formatted = formatHours(absoluteValue);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
};

const formatDayDifference = (value: number) => `${Math.abs(Math.round(value * 10) / 10).toFixed(1)}日`;

const formatNullableIndex = (value: number | null) => (value === null ? "-" : value.toFixed(2));

const getEvmUnavailableReasons = (project: Project) => {
  const leafTasks = getLeafTasks(project.id, tasks);
  const reasons: string[] = [];

  if (leafTasks.length === 0) reasons.push("計算対象となるLEAFタスクがありません。");
  if (leafTasks.some((task) => !task.plannedStartDate || !task.plannedEndDate)) {
    reasons.push("予定開始日または予定終了日が未設定のタスクがあります。");
  }
  if (leafTasks.reduce((total, task) => total + task.plannedHours, 0) === 0) {
    reasons.push("予定工数の合計が0時間です。");
  }

  return reasons;
};

const calculatePlannedValue = (project: Project, baseDate: string) =>
  getLeafTasks(project.id, tasks).reduce((total, task) => {
    if (baseDate < task.plannedStartDate) return total;
    if (baseDate >= task.plannedEndDate) return total + task.plannedHours;

    const elapsedDays = getInclusiveDays(task.plannedStartDate, baseDate);
    const totalDays = getInclusiveDays(task.plannedStartDate, task.plannedEndDate);
    return total + task.plannedHours * elapsedDays / totalDays;
  }, 0);

const PlanWarningPanel = ({ project }: { project: Project }) => {
  const warnings = getLeafTasks(project.id, tasks).flatMap((task) => {
    const messages: string[] = [];
    if (task.plannedStartDate < project.startDate) {
      messages.push(`${task.name}: 予定開始日がプロジェクト開始日より前です。`);
    }
    if (task.plannedEndDate > project.targetEndDate) {
      messages.push(`${task.name}: 予定終了日がプロジェクト終了日より後です。`);
    }
    return messages;
  });

  if (warnings.length === 0) {
    return <p className="empty-state">計画不整合はありません。</p>;
  }

  return (
    <div className="constraint-box">
      <strong>プロジェクト期間外の予定があります。</strong>
      <ul>
        {warnings.map((warning) => <li key={warning}>{warning}</li>)}
      </ul>
    </div>
  );
};

const getBurndownEvaluation = (
  project: Project,
  bac: number,
  pv: number,
  ev: number,
): BurndownEvaluation => {
  const projectDays = getInclusiveDays(project.startDate, project.targetEndDate);
  const plannedHoursPerDay = projectDays === 0 ? 0 : bac / projectDays;
  const idealRemaining = Math.max(0, bac - pv);
  const actualRemaining = Math.max(0, bac - ev);
  const hourDifference = actualRemaining - idealRemaining;
  const dayDifference = plannedHoursPerDay === 0 ? null : hourDifference / plannedHoursPerDay;
  const help = [
    `理想残: ${formatHours(idealRemaining)}`,
    `実績残: ${formatHours(actualRemaining)}`,
    `差分: ${formatSignedHours(hourDifference)}`,
    `日数換算: ${dayDifference === null ? "-" : formatDayDifference(dayDifference)}`,
  ];

  if (dayDifference === null) {
    return {
      tone: "warning",
      message: "-",
      help,
    };
  }

  if (dayDifference > 0) {
    return {
      tone: "danger",
      message: `理想より${formatDayDifference(dayDifference)}分多く残っています。`,
      help,
    };
  }

  if (dayDifference < 0) {
    return {
      tone: "good",
      message: `理想より${formatDayDifference(dayDifference)}分少なく残っています。`,
      help,
    };
  }

  return {
    tone: "good",
    message: "理想残と同じ残りです。",
    help,
  };
};

const buildTimeline = (start: string, end: string) =>
  Array.from({ length: getInclusiveDays(start, end) }, (_, index) =>
    toDateInputValue(new Date(toDate(start).getTime() + index * dayMs)),
  );

const GanttWbsTable = ({
  project,
  taskList,
  selectedTaskId,
  onSelectTask,
  emptyContent,
}: {
  project: Project;
  taskList: WbsTask[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  emptyContent?: React.ReactNode;
}) => {
  const [isMetricsVisible, setIsMetricsVisible] = useState(false);
  const [openHourEditor, setOpenHourEditor] = useState<{ taskId: string; field: HourField } | null>(null);
  const [hourValues, setHourValues] = useState<Record<string, string>>({});
  const taskOrder = new Map(taskList.map((task, index) => [task.id, index]));
  const taskSummaries = new Map(
    taskList.map((task) => [task.id, buildTaskSummary(task, project, tasks, studyLogs)]),
  );
  const workTaskSummaries = taskList
    .filter((task) => isWorkTask(task, taskList))
    .map((task) => taskSummaries.get(task.id)!)
    .filter(Boolean);
  const compareTasks = (a: WbsTask, b: WbsTask) => {
    const summaryA = taskSummaries.get(a.id)!;
    const summaryB = taskSummaries.get(b.id)!;
    const startCompare = summaryA.plannedStartDate.localeCompare(summaryB.plannedStartDate);
    if (startCompare !== 0) return startCompare;
    const endCompare = summaryA.plannedEndDate.localeCompare(summaryB.plannedEndDate);
    if (endCompare !== 0) return endCompare;
    return (taskOrder.get(a.id) ?? 0) - (taskOrder.get(b.id) ?? 0);
  };
  const topLevelRows = taskList
    .filter((task) => task.parentId === null)
    .sort(compareTasks)
    .flatMap((task) => {
      const children = taskList.filter((child) => child.parentId === task.id).sort(compareTasks);
      return children.length > 0 ? [task, ...children] : [task];
    });
  const timelineStart = [project.startDate, ...workTaskSummaries.map((summary) => summary.plannedStartDate)].sort()[0];
  const timelineEndCandidates = [project.targetEndDate, ...workTaskSummaries.map((summary) => summary.plannedEndDate)].sort();
  const timelineEnd = timelineEndCandidates[timelineEndCandidates.length - 1] ?? project.targetEndDate;
  const timelineDays = buildTimeline(timelineStart, timelineEnd);
  const timelineWidth = timelineDays.length * dayWidth;
  const fixedColumns = isMetricsVisible ? "280px 64px 64px 84px" : "minmax(300px, 1fr)";
  const todayOffset = Math.round((toDate(today).getTime() - toDate(timelineStart).getTime()) / dayMs);
  const showToday = todayOffset >= 0 && todayOffset < timelineDays.length;
  const getHourKey = (taskId: string, field: HourField) => `${taskId}:${field}`;
  const getHourValue = (taskId: string, field: HourField, fallback: number) =>
    hourValues[getHourKey(taskId, field)] ?? formatHourNumber(fallback);
  const updateHourValue = (taskId: string, field: HourField, value: string) => {
    setHourValues((current) => ({ ...current, [getHourKey(taskId, field)]: value }));
  };
  const rows = topLevelRows.map((task) => {
    const summary = taskSummaries.get(task.id)!;
    const level = getTaskLevel(task, tasks);
    const isParent = !isWorkTask(task, taskList);
    const offset = Math.round((toDate(summary.plannedStartDate).getTime() - toDate(timelineStart).getTime()) / dayMs);
    const duration = getInclusiveDays(summary.plannedStartDate, summary.plannedEndDate);
    const barLeft = offset * dayWidth + 4;
    const barWidth = Math.max(dayWidth - 8, duration * dayWidth - 8);

    return {
      task,
      summary,
      level,
      isParent,
      barLeft,
      barWidth,
      plannedHours: getHourValue(task.id, "planned", summary.plannedHours),
      actualHours: formatHourNumber(summary.actualHours),
    };
  });

  return (
    <>
      <div className={`gantt-board ${isMetricsVisible ? "gantt-metrics-expanded" : "gantt-metrics-collapsed"}`}>
      <div className="gantt-fixed-pane">
        <div className="gantt-row gantt-head gantt-fixed-row" style={{ gridTemplateColumns: fixedColumns }}>
          <div className="gantt-column-heading">
            <span>件名</span>
            <button
              aria-expanded={isMetricsVisible}
              className="gantt-metrics-toggle"
              onClick={() => {
                setIsMetricsVisible((current) => !current);
                setOpenHourEditor(null);
              }}
              type="button"
            >
              {isMetricsVisible ? "工数・進捗を隠す" : "工数・進捗を表示"}
            </button>
          </div>
          {isMetricsVisible && <span>予定(h)</span>}
          {isMetricsVisible && <span>実績(h)</span>}
          {isMetricsVisible && <span>進捗</span>}
        </div>
        {rows.map(({ task, summary, level, isParent, plannedHours, actualHours }) => (
          <div
            className={[
              "gantt-row",
              "gantt-fixed-row",
              isParent ? "parent-row" : "work-row",
              selectedTaskId === task.id ? "selected" : "",
            ].filter(Boolean).join(" ")}
            key={task.id}
            style={{ gridTemplateColumns: fixedColumns }}
          >
            <button
              aria-label={`${task.name}の詳細を開く`}
              className="gantt-task-name"
              onClick={(event) => {
                event.stopPropagation();
                onSelectTask(task.id);
              }}
              title="タスク詳細を開く"
              style={{ paddingLeft: `${level * 22 + 12}px` }}
              type="button"
            >
              <span aria-hidden="true" className="task-icon">{isParent ? "▾" : "↳"}</span>
              <span className="gantt-task-label">{task.name}</span>
              {isParent && <span className="gantt-task-type">親タスク</span>}
            </button>
            {isMetricsVisible && (
              <>
                <div className="gantt-hour-cell">
                  {isParent ? (
                    <span className="gantt-empty-value">—</span>
                  ) : (
                    <button
                      aria-label={`${task.name}の予定工数を編集`}
                      className="gantt-hour-value"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenHourEditor({ taskId: task.id, field: "planned" });
                      }}
                      title="予定工数を編集"
                      type="button"
                    >
                      {plannedHours}
                    </button>
                  )}
                  {!isParent && openHourEditor?.taskId === task.id && openHourEditor.field === "planned" && (
                    <div className="gantt-hour-popover" role="dialog" aria-label="予定工数を編集">
                      <label>
                        予定
                        <span className="hour-input-row">
                          <input autoFocus min="0" onChange={(event) => updateHourValue(task.id, "planned", event.target.value)} step="0.25" type="number" value={plannedHours} />
                          <span>時間</span>
                        </span>
                      </label>
                      <button className="primary-button" onClick={() => setOpenHourEditor(null)} type="button">保存</button>
                    </div>
                  )}
                </div>
                <div className="gantt-hour-cell">
                  {isParent ? (
                    <span className="gantt-empty-value">—</span>
                  ) : (
                    <span className="gantt-readonly-value" title="学習記録から集計した実績工数です。">
                      {actualHours}
                    </span>
                  )}
                </div>
                {isParent ? (
                  <span className="gantt-muted-cell">対象外</span>
                ) : (
                  <select
                    aria-label={`${task.name}の進捗率`}
                    className="gantt-progress-select"
                    defaultValue={Math.round(summary.progress / 10) * 10}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {Array.from({ length: 11 }, (_, index) => index * 10).map((progress) => (
                      <option key={progress} value={progress}>{progress}%</option>
                    ))}
                  </select>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <div className="gantt-timeline-pane">
        <div className="gantt-timeline-content" style={{ width: `${timelineWidth}px` }}>
          <div className="gantt-row gantt-head gantt-timeline-row">
            <div className="gantt-date-axis" style={{ gridTemplateColumns: `repeat(${timelineDays.length}, ${dayWidth}px)` }}>
              {timelineDays.map((date) => (
                <span className={date === today ? "today-axis" : ""} key={date}>
                  {formatDate(date)}
                </span>
              ))}
            </div>
          </div>
          {rows.map(({ task, summary, isParent, barLeft, barWidth }) => (
            <div
              className={[
                "gantt-row",
                "gantt-timeline-row",
                isParent ? "parent-row" : "work-row",
                selectedTaskId === task.id ? "selected" : "",
              ].filter(Boolean).join(" ")}
              key={task.id}
            >
              <div className="gantt-chart-cell" style={{ backgroundSize: `${dayWidth}px 100%`, width: `${timelineWidth}px` }}>
                {showToday && <span className="today-marker" style={{ left: `${todayOffset * dayWidth}px` }} />}
                {isParent ? (
                  <span className="gantt-parent-note">配下タスクで管理</span>
                ) : (
                  <span
                    className={`gantt-bar ${summary.status}${summary.isDelayed ? " delayed" : ""}`}
                    style={{ left: `${barLeft}px`, width: `${barWidth}px` }}
                  >
                    {isMetricsVisible && formatIntegerProgress(summary.progress)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {rows.length === 0 && emptyContent && (
        <div className="gantt-empty-body">{emptyContent}</div>
      )}
      </div>
    </>
  );
};

const StudyLogEditorPanel = ({
  initialLog,
  initialTaskId,
  taskList,
  onCancel,
  onDelete,
  onSave,
}: {
  initialLog?: StudyLog;
  initialTaskId?: string;
  taskList: WbsTask[];
  onCancel: () => void;
  onDelete?: () => void;
  onSave: () => void;
}) => {
  const isEdit = Boolean(initialLog);
  const defaultTaskId = initialLog?.taskId ?? initialTaskId ?? "";

  return (
    <aside className="task-side-panel study-log-side-panel" onClick={(event) => event.stopPropagation()}>
      <div className="record-panel-header">
        <div>
          <p className="eyebrow">{isEdit ? "学習記録を編集" : "学習記録を追加"}</p>
          <h3>{isEdit ? "登録済みの実績を修正" : "学習した実績を記録"}</h3>
        </div>
        <button className="icon-button muted" onClick={onCancel} aria-label="閉じる" type="button">×</button>
      </div>

      <div className="form-row">
        <label>
          学習日
          <input defaultValue={initialLog?.studyDate ?? today} max={today} type="date" />
        </label>
        <label>
          学習時間（実績）
          <input defaultValue={initialLog?.hours ?? 1} min="0.25" step="0.25" type="number" />
        </label>
      </div>

      <label>
        対象タスク
        <select defaultValue={defaultTaskId}>
          {!defaultTaskId && <option value="">タスクを選択</option>}
          {taskList.map((task) => (
            <option key={task.id} value={task.id}>{task.name}</option>
          ))}
        </select>
      </label>

      <label>
        メモ（任意）
        <textarea defaultValue={initialLog?.memo ?? ""} maxLength={5000} placeholder="必要な場合だけ補足を入力" />
      </label>

      <p className="form-helper">学習日、対象タスク、学習時間（実績）だけで保存できます。</p>

      <div className="side-panel-actions">
        <button className="primary-button" onClick={onSave} type="button">保存する</button>
        <button className="secondary-button" onClick={onCancel} type="button">キャンセル</button>
        {isEdit && onDelete && (
          <button
            className="secondary-button danger-text"
            onClick={() => {
              if (window.confirm("この学習記録を削除しますか？")) onDelete();
            }}
            type="button"
          >
            削除
          </button>
        )}
      </div>
    </aside>
  );
};

const TaskSidePanel = ({
  task,
  project,
  taskList,
  onAddStudyLog,
  onClose,
}: {
  task: WbsTask;
  project: Project;
  taskList: WbsTask[];
  onAddStudyLog: (taskId: string) => void;
  onClose: () => void;
}) => {
  const summary = buildTaskSummary(task, project, tasks, studyLogs);
  const isParent = !isWorkTask(task, taskList);
  const parentTasks = taskList.filter((candidate) => !isWorkTask(candidate, taskList));
  const childTaskIds = taskList.filter((candidate) => candidate.parentId === task.id).map((candidate) => candidate.id);
  const relatedLogs = isParent
    ? studyLogs.filter((log) => childTaskIds.includes(log.taskId))
    : studyLogs.filter((log) => log.taskId === task.id);
  const canDelete = relatedLogs.length === 0;

  return (
    <aside className="task-side-panel" onClick={(event) => event.stopPropagation()}>
      <div className="side-panel-title-row">
        <label>
          {isParent ? "親タスク名" : "タスク名"}
          <input defaultValue={task.name} maxLength={100} />
        </label>
        <button className="icon-button muted" onClick={onClose} aria-label="閉じる" type="button">×</button>
      </div>

      {isParent ? (
        <div className="side-panel-status">
          <span className="badge neutral">見出し</span>
          <span className="badge neutral">計算対象外</span>
        </div>
      ) : (
        <div className="side-panel-status">
          <StatusPill status={summary.status} />
          {summary.isDelayed && <span className="badge danger">遅延</span>}
          {summary.isOutOfProjectRange && <span className="badge warning">期間外</span>}
        </div>
      )}

      {isParent ? (
        <label>
          説明
          <textarea defaultValue={task.description} maxLength={5000} />
        </label>
      ) : (
        <>
          <label>
            親タスク
            <select defaultValue={task.parentId ?? ""}>
              <option value="">親なし</option>
              {parentTasks.map((parentTask) => (
                <option key={parentTask.id} value={parentTask.id}>{parentTask.name}</option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              予定開始日
              <input defaultValue={summary.plannedStartDate} type="date" />
            </label>
            <label>
              予定終了日
              <input defaultValue={summary.plannedEndDate} type="date" />
            </label>
          </div>
        </>
      )}

      {isParent ? (
        <div className="side-panel-section">
          <strong>親タスクの扱い</strong>
          <p>親タスクは章や単元をまとめる見出しです。予定、実績、進捗、学習記録は配下タスクで管理します。</p>
          <p>{canDelete ? "削除時は確認後、配下タスクも削除対象になります。" : "配下タスクに学習記録があるため削除できません。"}</p>
        </div>
      ) : (
        <div className="side-panel-section">
          <strong>実績工数</strong>
          <p>{formatHours(summary.actualHours)} / 学習記録 {relatedLogs.length}件から集計</p>
          <div className="learning-record-preview">
            {relatedLogs.slice(0, 2).map((log) => (
              <span key={log.id}>{formatDate(log.studyDate)} {formatHours(log.hours)}</span>
            ))}
            {relatedLogs.length === 0 && <span>まだ学習記録はありません。</span>}
          </div>
          <button className="secondary-button" onClick={() => onAddStudyLog(task.id)} type="button">学習記録を追加</button>
        </div>
      )}

      {!canDelete && (
        <div className="constraint-box">
          <strong>削除できない理由</strong>
          <p>学習記録 {relatedLogs.length}件があります。</p>
        </div>
      )}

      <div className="side-panel-actions">
        <button className="primary-button" type="button">保存</button>
        <button className="secondary-button" disabled={!canDelete} type="button">
          {canDelete ? "削除" : "削除不可"}
        </button>
      </div>
    </aside>
  );
};

const EvmPanel = ({ project, onMove }: { project: Project; onMove: (screen: Screen) => void }) => {
  const summary = buildProjectSummary(project, tasks, studyLogs);
  const unavailableReasons = getEvmUnavailableReasons(project);
  const isCalculable = unavailableReasons.length === 0;
  const pv = isCalculable ? calculatePlannedValue(project, today) : null;
  const ev = Math.round((summary.plannedHours * summary.progress) / 100 * 100) / 100;
  const ac = studyLogs
    .filter((log) => log.projectId === project.id && log.studyDate <= today)
    .reduce((total, log) => total + log.hours, 0);
  const sv = pv === null ? null : ev - pv;
  const cv = isCalculable ? ev - ac : null;
  const spi = pv === null || pv === 0 ? null : ev / pv;
  const cpi = !isCalculable || ac === 0 ? null : ev / ac;
  const spiEvaluation = getIndexEvaluation(spi, "遅れ");
  const cpiEvaluation = getIndexEvaluation(cpi, "超過");
  const burndownEvaluation = isCalculable && pv !== null
    ? getBurndownEvaluation(project, summary.plannedHours, pv, ev)
    : null;

  return (
    <div className="evm-layout">
      <div className="evm-metrics">
        <Metric label="BAC" value={isCalculable ? formatHours(summary.plannedHours) : "-"} help={evmHelp.BAC} />
        <Metric label="PV" value={pv === null ? "-" : formatHours(pv)} help={evmHelp.PV} />
        <Metric label="EV" value={isCalculable ? formatHours(ev) : "-"} help={evmHelp.EV} />
        <Metric label="AC" value={isCalculable ? formatHours(ac) : "-"} help={evmHelp.AC} />
        <Metric label="SV" value={formatSignedHours(sv)} help={svHelp} />
        <Metric label="CV" value={formatSignedHours(cv)} help={evmHelp.CV} />
        <Metric label="SPI" value={formatNullableIndex(spi)} tone={spiEvaluation.tone} statusLabel={spiEvaluation.statusLabel} help={evmHelp.SPI} />
        <Metric label="CPI" value={formatNullableIndex(cpi)} tone={cpiEvaluation.tone} statusLabel={cpiEvaluation.statusLabel} help={evmHelp.CPI} />
      </div>
      <div className="chart-card">
        <div className="chart-card-header">
          <strong>バーンダウン</strong>
          <InfoHelp label="バーンダウン" help={burndownHelp} />
        </div>
        {burndownEvaluation ? (
          <>
            <div className={`burndown-message ${burndownEvaluation.tone}`}>
              <strong>{burndownEvaluation.message}</strong>
              <InfoHelp label="バーンダウン差分" help={burndownEvaluation.help} />
            </div>
            <div className="chart-legend" aria-hidden="true">
              <span><i className="legend-line ideal" />理想線</span>
              <span><i className="legend-line actual" />実績線</span>
            </div>
            <div className="chart-line ideal" />
            <div className="chart-line actual" />
            <span className="chart-label start">BAC</span>
            <span className="chart-label end">0h</span>
            <p>残作業時間の理想線と実績線の差分を確認します。</p>
          </>
        ) : (
          <div className="constraint-box neutral-box">
            <strong>バーンダウンはまだ表示できません。</strong>
            <ul>{unavailableReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            {unavailableReasons.some((reason) => reason.includes("予定開始日")) && (
              <button className="secondary-button" onClick={() => onMove("wbs")} type="button">WBSで予定日を設定</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ProjectForm = ({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: () => void;
}) => (
  <section className="screen-grid">
    <CreationFlowHeader
      description="まずプロジェクトの目的と期間を登録します。WBSは作成後に1から追加します。"
      steps={[
        { label: "1 プロジェクト情報を入力", state: "active" },
        { label: "2 WBSを作成" },
        { label: "3 予定を設定" },
      ]}
      title="プロジェクト情報だけ先に登録する"
    />

    <div className="manual-project-form-layout wide">
      <div className="panel form-panel manual-project-form">
        <div className="panel-header">
          <div>
            <h2>基本情報</h2>
          </div>
        </div>
        <label>
          プロジェクト名 <span className="required-label">必須</span>
          <input defaultValue="Java基礎を学ぶ" maxLength={100} placeholder="例: Java Silver 合格" />
        </label>
        <label>
          概要
          <textarea
            defaultValue="Javaの基礎を学び直し、簡単なプログラムを自力で作れるようにする。"
            maxLength={5000}
            placeholder="学習目的や到達したい状態を入力"
          />
        </label>
        <div className="form-row">
          <label>
            開始日 <span className="required-label">必須</span>
            <input type="date" defaultValue="2026-06-08" />
          </label>
          <label>
            目標終了日 <span className="required-label">必須</span>
            <input type="date" defaultValue="2026-07-15" />
          </label>
        </div>
        <p className="form-helper">新規プロジェクトは「未着手」で作成されます。保存後、プロジェクト概要からWBS作成へ進みます。</p>
        <div className="form-submit-bar">
          <button className="secondary-button" onClick={onCancel} type="button">キャンセル</button>
          <button className="primary-button" onClick={onCreate} type="button">プロジェクトを作成</button>
        </div>
      </div>
    </div>
  </section>
);

const WbsEditor = ({ project, onMove }: { project: Project; onMove: (screen: Screen) => void }) => {
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [studyLogTaskId, setStudyLogTaskId] = useState<string | null>(null);
  const [addType, setAddType] = useState<"parent" | "task" | null>(null);
  const [saveNotice, setSaveNotice] = useState("");
  const isEmpty = projectTasks.length === 0;
  const selectedTask = projectTasks.find((task) => task.id === selectedTaskId) ?? null;

  const openAdd = (type: "parent" | "task") => {
    setAddType(type);
    setSelectedTaskId(null);
    setStudyLogTaskId(null);
  };

  const closeAdd = () => setAddType(null);

  return (
    <section className="screen-grid project-workspace-screen">
      <ProjectWorkspaceHeader active="wbs" hasNoTasks={isEmpty} onMove={onMove} project={project} />
      <section className="panel wide">
        <div className="panel-header">
          <div>
            <h2>WBS・ガントチャート</h2>
            <p>
              {isEmpty
                ? "まだWBSはありません。学習内容のまとまりから登録します。"
                : "親タスクは見出し、タスクは予定と進捗の入力対象です。実績は学習記録から集計します。"}
            </p>
          </div>
          <div className="button-group">
            <button className="secondary-button" onClick={() => openAdd("parent")} type="button">親タスクを追加</button>
            <button className="primary-button" onClick={() => openAdd("task")} type="button">タスクを追加</button>
          </div>
        </div>
        {saveNotice && <div className="save-notice" role="status">{saveNotice}</div>}
        <div
          className={selectedTask && !addType ? "gantt-workspace with-side-panel" : "gantt-workspace"}
          onClick={selectedTask && !addType ? () => {
            setSelectedTaskId(null);
            setStudyLogTaskId(null);
          } : undefined}
        >
          <GanttWbsTable
            project={project}
            selectedTaskId={selectedTask?.id ?? null}
            taskList={projectTasks}
            onSelectTask={(taskId) => {
              setSelectedTaskId(taskId);
              setStudyLogTaskId(null);
              setSaveNotice("");
            }}
            emptyContent={!addType ? (
              <div className="empty-gantt-message">
                <strong>WBSタスクがありません</strong>
                <p>親タスクで学習範囲をまとめるか、親なしタスクを直接追加してください。</p>
                <div className="button-group">
                  <button className="secondary-button" onClick={() => openAdd("parent")} type="button">最初の親タスクを追加</button>
                  <button className="text-button" onClick={() => openAdd("task")} type="button">親なしタスクを追加</button>
                </div>
              </div>
            ) : undefined}
          />
          {selectedTask && studyLogTaskId && !addType ? (
            <StudyLogEditorPanel
              initialTaskId={studyLogTaskId}
              key={`create-${studyLogTaskId}`}
              taskList={getLeafTasks(project.id, tasks)}
              onCancel={() => setStudyLogTaskId(null)}
              onSave={() => {
                setStudyLogTaskId(null);
                setSaveNotice("学習記録を追加し、実績工数を再集計しました。");
              }}
            />
          ) : selectedTask && !addType ? (
            <TaskSidePanel
              key={selectedTask.id}
              task={selectedTask}
              project={project}
              taskList={projectTasks}
              onAddStudyLog={setStudyLogTaskId}
              onClose={() => setSelectedTaskId(null)}
            />
          ) : null}
          {addType && (
            <aside className="task-side-panel" onClick={(event) => event.stopPropagation()}>
              <div className="record-panel-header">
                <div>
                  <p className="eyebrow">{addType === "parent" ? "親タスクを追加" : "タスクを追加"}</p>
                  <h3>{addType === "parent" ? "学習範囲の見出しを作る" : "実際に学習する作業を作る"}</h3>
                </div>
                <button className="icon-button muted" onClick={closeAdd} aria-label="閉じる" type="button">×</button>
              </div>
              <label>
                {addType === "parent" ? "親タスク名" : "タスク名"}
                <input
                  defaultValue={addType === "parent" ? "第1章 Javaの基本" : "第1章を読む"}
                  maxLength={100}
                />
              </label>
              <label>
                説明（任意）
                <textarea
                  className="compact-textarea"
                  defaultValue={addType === "parent" ? "Javaの基本文法を学ぶまとまり。" : "教材の第1章を読み、基本文法を確認する。"}
                />
              </label>
              {addType === "parent" ? (
                <div className="constraint-box neutral-box">
                  <strong>親タスクは見出しです</strong>
                  <p>予定日、予定工数、進捗率は持たず、配下タスクで管理します。</p>
                </div>
              ) : (
                <>
                  <label>
                    親タスク
                    <select defaultValue="">
                      <option value="">親なしで追加</option>
                    </select>
                    <span className="field-note">親タスクを先に作成すると、ここから選択できます。</span>
                  </label>
                  <div className="form-row">
                    <label>
                      予定開始日
                      <input type="date" defaultValue="2026-06-08" />
                    </label>
                    <label>
                      予定終了日
                      <input type="date" defaultValue="2026-06-10" />
                    </label>
                  </div>
                  <label>
                    予定工数
                    <span className="input-with-unit"><input type="number" min="0.25" step="0.25" defaultValue="3" /><span>時間</span></span>
                  </label>
                  <p className="form-helper">進捗率は0%で作成されます。</p>
                </>
              )}
              <div className="side-panel-actions">
                <button className="primary-button" onClick={closeAdd} type="button">追加</button>
                <button className="secondary-button" onClick={closeAdd} type="button">キャンセル</button>
              </div>
            </aside>
          )}
        </div>
      </section>
    </section>
  );
};

type StudyLogPanelState =
  | { mode: "create" }
  | { mode: "edit"; log: StudyLog };

const StudyLogList = ({ project, onMove }: { project: Project; onMove: (screen: Screen) => void }) => {
  const projectLogs = [...studyLogs]
    .filter((log) => log.projectId === project.id)
    .sort((a, b) =>
      b.studyDate === a.studyDate
        ? b.updatedAt.localeCompare(a.updatedAt)
        : b.studyDate.localeCompare(a.studyDate),
    );
  const projectTasks = getLeafTasks(project.id, tasks);
  const projectStudyHours = projectLogs.reduce((sum, log) => sum + log.hours, 0);
  const [panelState, setPanelState] = useState<StudyLogPanelState | null>(null);
  const [saveNotice, setSaveNotice] = useState("");

  return (
    <section className="screen-grid project-workspace-screen">
      <ProjectWorkspaceHeader active="studyLogs" hasNoTasks={tasks.filter(t => t.projectId === project.id).length === 0} onMove={onMove} project={project} />
      <section className="panel wide">
        <div className="panel-header">
          <div>
            <h2>学習記録</h2>
            <p>アプリ外で実施した学習実績を、プロジェクト内で登録・確認・編集・削除します。</p>
          </div>
          <div className="badge-list">
            <span className="badge neutral">合計 {formatHours(projectStudyHours)}</span>
            <button
              className="primary-button"
              onClick={() => {
                setPanelState({ mode: "create" });
                setSaveNotice("");
              }}
              type="button"
            >
              学習記録を追加
            </button>
          </div>
        </div>

        {saveNotice && <div className="save-notice" role="status">{saveNotice}</div>}

        <div className="study-log-panel-host">
          <div className="data-list log-list">
            {projectLogs.length > 0 && (
              <div className="data-list-row data-list-head log-item">
                <span>日付 / 時間</span>
                <span>タスク</span>
                <span>メモ</span>
              </div>
            )}
            {projectLogs.map((log) => {
              const task = tasks.find((item) => item.id === log.taskId);

              return (
                <button
                  aria-label={`${formatDate(log.studyDate)} ${task?.name ?? "タスク未設定"}の学習記録を編集`}
                  className={panelState?.mode === "edit" && panelState.log.id === log.id
                    ? "data-list-row log-item clickable clickable-log-item selected"
                    : "data-list-row log-item clickable clickable-log-item"}
                  key={log.id}
                  onClick={() => {
                    setPanelState({ mode: "edit", log });
                    setSaveNotice("");
                  }}
                  type="button"
                >
                  <strong>{formatDate(log.studyDate)} / {formatHours(log.hours)}</strong>
                  <span>{task?.name}</span>
                  <span>{log.memo}</span>
                </button>
              );
            })}
            {projectLogs.length === 0 && (
              <div className="empty-state">学習記録はまだありません。</div>
            )}
          </div>

          {panelState && (
            <StudyLogEditorPanel
              initialLog={panelState.mode === "edit" ? panelState.log : undefined}
              key={panelState.mode === "edit" ? panelState.log.id : "create"}
              taskList={projectTasks}
              onCancel={() => setPanelState(null)}
              onDelete={panelState.mode === "edit" ? () => {
                setPanelState(null);
                setSaveNotice("学習記録を削除し、実績工数を再集計しました。");
              } : undefined}
              onSave={() => {
                setPanelState(null);
                setSaveNotice(panelState.mode === "edit"
                  ? "学習記録を更新し、実績工数を再集計しました。"
                  : "学習記録を追加し、実績工数を再集計しました。");
              }}
            />
          )}
        </div>
      </section>
    </section>
  );
};

const AiPlanMethod = ({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (mode: "simple" | "toc") => void;
}) => {
  const [selectedMode, setSelectedMode] = useState<"simple" | "toc">("simple");

  return (
    <section className="screen-grid">
    <CreationFlowHeader
      description="入力できる情報に合わせて作成方法を選びます。生成後のWBS下書きを確認してから保存します。"
      steps={[
        { label: "1 作成方法", state: "active" },
        { label: "2 条件・教材" },
        { label: "3 WBS下書き" },
      ]}
      title="どのくらい詳しく計画しますか？"
    />

    <section className="panel wide ai-method-panel">
      <div className="ai-method-grid">
        <button
          aria-pressed={selectedMode === "simple"}
          className={selectedMode === "simple" ? "ai-method-card selected" : "ai-method-card"}
          onClick={() => setSelectedMode("simple")}
          type="button"
        >
          <span className="badge neutral">入力が少ない</span>
          <strong>概要から作成</strong>
          <p>学習目標、期限、学習内容の概要から、大まかなWBS案を作ります。</p>
          <small>教材の目次が手元にない場合に向いています。</small>
        </button>
        <button
          aria-pressed={selectedMode === "toc"}
          className={selectedMode === "toc" ? "ai-method-card selected" : "ai-method-card"}
          onClick={() => setSelectedMode("toc")}
          type="button"
        >
          <span className="badge good">教材に沿って作る</span>
          <strong>目次から作成</strong>
          <p>画像から読み取るか、目次を直接入力して、教材構成に沿ったWBS案を作ります。</p>
          <small>章や単元を計画へ正確に反映したい場合に向いています。</small>
        </button>
      </div>
      <section className="ai-disclosure" aria-labelledby="ai-disclosure-title">
        <div className="ai-disclosure-title">
          <span id="ai-disclosure-title">AI利用と送信内容</span>
          <small>
            {selectedMode === "toc"
              ? "目次画像はGoogle Cloud Vision、入力テキストと生成条件はOpenAIへ送信します。"
              : "入力テキストと生成条件はOpenAIへ送信します。"}
          </small>
        </div>
        <div className="ai-disclosure-content">
          <dl>
            {selectedMode === "toc" && (
              <div>
                <dt>Google Cloud Visionへ送信</dt>
                <dd>選択した目次画像だけを文字認識のために送信します。</dd>
              </div>
            )}
            <div>
              <dt>OpenAIへ送信</dt>
              <dd>修正済みテキストと、学習ペース・分割単位を含む生成条件を送信します。</dd>
            </div>
            <div>
              <dt>送信しない情報</dt>
              <dd>画像そのもの、認証情報、学習記録、他のプロジェクト情報は送信しません。</dd>
            </div>
          </dl>
          <p>
            次の画面へ進むことで上記の送信範囲に同意したものとして扱います。
            {selectedMode === "toc" && (
              <a href="https://cloud.google.com/terms/cloud-privacy-notice" rel="noreferrer" target="_blank">Googleのデータ利用方針</a>
            )}
            <a href="https://openai.com/policies/privacy-policy/" rel="noreferrer" target="_blank">OpenAIのプライバシーポリシー</a>
          </p>
        </div>
      </section>
      <div className="form-submit-bar">
        <button className="secondary-button" onClick={onBack} type="button">プロジェクト一覧へ戻る</button>
        <button className="primary-button" onClick={() => onSelect(selectedMode)} type="button">次へ</button>
      </div>
    </section>
    </section>
  );
};

const AiPlanInput = ({
  mode,
  onMove,
}: {
  mode: "simple" | "toc";
  onMove: (screen: Screen) => void;
}) => {
  const [materialMode, setMaterialMode] = useState<"text" | "image">("image");
  const [ocrStatus, setOcrStatus] = useState<"uploaded" | "reading" | "complete">("uploaded");
  const [previewPage, setPreviewPage] = useState<number | null>(null);
  const [showOcrEditor, setShowOcrEditor] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const isSimple = mode === "simple";
  const canGenerate = isSimple || materialMode === "text" || ocrStatus === "complete";
  const summarySampleText = "Java SE 17 Silverの合格に必要な基礎文法、クラス設計、例外処理、コレクションを学び、最後に模擬問題で確認する。";
  const tocImageFiles = [
    ["目次_01.png", "2.4MB"],
    ["目次_02.png", "1.8MB"],
    ["目次_03.png", "2.1MB"],
    ["目次_04.png", "1.9MB"],
    ["目次_05.png", "2.2MB"],
    ["目次_06.png", "1.7MB"],
    ["目次_07.png", "1.6MB"],
    ["目次_08.png", "2.0MB"],
    ["目次_09.png", "1.5MB"],
    ["目次_10.png", "1.8MB"],
  ];
  const previewChapterTitles = [
    "Flutterを始めよう",
    "Dartの基本",
    "ウィジェットの基本",
    "画面遷移",
    "状態管理",
    "データの保存",
    "API通信",
    "テスト",
    "パフォーマンス",
    "アプリの公開",
  ];
  const ocrSampleText = `Chapter 1 Flutterを始めよう
  1-1 Flutterとは
  1-2 開発環境を準備する
  1-3 プロジェクトを作成する
  1-4 アプリを実行する
Chapter 2 Dartの基本
  2-1 変数とデータ型
  2-2 演算子
  2-3 条件分岐
  2-4 繰り返し
  2-5 関数
Chapter 3 ウィジェットの基本
  3-1 StatelessWidget
  3-2 StatefulWidget
  3-3 レイアウト
  3-4 ボタンと入力
  3-5 リスト表示
Chapter 4 画面遷移
  4-1 Navigator
  4-2 画面間のデータ受け渡し
  4-3 タブによる画面切り替え
  4-4 ダイアログ
Chapter 5 状態管理
  5-1 状態管理とは
  5-2 setState
  5-3 Provider
  5-4 非同期処理
  5-5 エラー処理
Chapter 6 データの保存
  6-1 SharedPreferences
  6-2 SQLite
  6-3 JSONの扱い
  6-4 API通信
  6-5 データモデル
Chapter 7 アプリの品質
  7-1 入力チェック
  7-2 単体テスト
  7-3 ウィジェットテスト
  7-4 デバッグ
  7-5 パフォーマンス
Chapter 8 アプリを公開しよう
  8-1 アプリアイコン
  8-2 リリースビルド
  8-3 Androidで公開する
  8-4 iOSで公開する`;
  const [ocrText, setOcrText] = useState(ocrSampleText);
  const [ocrDraft, setOcrDraft] = useState(ocrSampleText);
  const [directText, setDirectText] = useState(tocSampleText);
  const [directDraft, setDirectDraft] = useState(tocSampleText);

  const startOcr = () => {
    setOcrStatus("reading");
    window.setTimeout(() => setOcrStatus("complete"), 1400);
  };

  const openOcrEditor = () => {
    setOcrDraft(ocrText);
    setShowOcrEditor(true);
  };

  const applyOcrEdit = () => {
    setOcrText(ocrDraft);
    setShowOcrEditor(false);
  };

  const openTextEditor = () => {
    setDirectDraft(directText);
    setShowTextEditor(true);
  };

  const applyTextEdit = () => {
    setDirectText(directDraft);
    setShowTextEditor(false);
  };

  useEffect(() => {
    if (previewPage === null && !showOcrEditor && !showTextEditor) return undefined;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewPage(null);
        setShowOcrEditor(false);
        setShowTextEditor(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewPage, showOcrEditor, showTextEditor]);

  return (
    <section className="screen-grid ai-plan-flow">
      <CreationFlowHeader
          description={
          isSimple
            ? "最低限の条件だけで始められます。生成されるWBSは大まかな案です。"
            : "OCR結果または入力した目次を確認してから、AIへ送信します。"
        }
        steps={[
          { label: "1 作成方法", state: "done" },
          { label: "2 条件・教材", state: "active" },
          { label: "3 WBS下書き" },
        ]}
        title={isSimple ? "目標と概要から、まず計画案を作る" : "教材の目次に沿った計画案を作る"}
      />

      <div className="panel form-panel ai-input-main">
        <div className="section-heading">
          <span className="section-number">1</span>
          <div>
            <h2>基本条件</h2>
          </div>
        </div>
        <label>
          学習目標 <span className="required-label">必須</span>
          <input defaultValue="Java Silverに合格する" maxLength={100} />
        </label>
        <label>
          プロジェクト名（任意）
          <input defaultValue="Java Silver 合格" maxLength={100} />
          <span className="field-hint">未入力の場合は、学習目標からAIが提案します。</span>
        </label>
        <div className="form-row">
          <label>
            学習開始日 <span className="required-label">必須</span>
            <input type="date" defaultValue="2026-06-08" />
          </label>
          <label>
            目標終了日 <span className="required-label">必須</span>
            <input type="date" defaultValue="2026-07-15" />
          </label>
        </div>

        <div className="section-divider" />
        <button aria-expanded={showPreferences} className="preference-toggle" onClick={() => setShowPreferences((current) => !current)} type="button">
          <span><strong>こだわり条件（任意）</strong><small>学習時間、学習できない日、重点範囲などを設定できます。</small></span>
          <span>{showPreferences ? "閉じる" : "設定する"}</span>
        </button>
        {showPreferences && (
          <div className="preference-fields">
            <div className="availability-grid">
              <label>平日<span className="input-with-unit"><input type="number" min="0" step="0.25" defaultValue="1" /><span>時間 / 日</span></span></label>
              <label>土日<span className="input-with-unit"><input type="number" min="0" step="0.25" defaultValue="2" /><span>時間 / 日</span></span></label>
            </div>
            <div className="pace-condition-grid">
              <label>学習量の総量（任意）<span className="input-with-unit"><input min="1" type="number" defaultValue="380" /><span>ページ</span></span></label>
              <label>1日あたりの学習量（任意）<span className="input-with-unit"><input min="0.25" step="0.25" type="number" defaultValue="10" /><span>ページ</span></span></label>
              <label>WBSの分割単位<select defaultValue="SECTION"><option value="SECTION">教材の章・節</option><option value="PAGE">ページ数</option><option value="QUESTION_SET">問題セット</option><option value="AI">AIに任せる</option></select><span className="field-hint">ページ数を選ぶ場合は、単位を「ページ」にして総量と1日あたりの学習量を入力します。</span></label>
            </div>
            <fieldset className="weekday-fieldset"><legend>学習できない曜日</legend><div className="weekday-options">{["月", "火", "水", "木", "金", "土", "日"].map((day) => <label className={day === "水" ? "weekday-option selected" : "weekday-option"} key={day}><input defaultChecked={day === "水"} type="checkbox" />{day}</label>)}</div></fieldset>
            <label>日程の補足<textarea className="compact-textarea" defaultValue="6月20日と21日は学習できない。試験前の1週間は平日も2時間確保できる。" /></label>
            <div className="form-row"><label>重点的に学ぶ範囲<textarea className="compact-textarea" defaultValue="クラス、継承、例外処理は問題演習を多めにする。" /></label><label>軽く確認・除外する範囲<textarea className="compact-textarea" defaultValue="Javaの実行環境の説明は理解済みなので短くする。" /></label></div>
          </div>
        )}

        <div className="section-divider" />
        <div className="section-heading"><span className="section-number">2</span><div><h2>{isSimple ? "学習内容の概要" : "教材の目次"}</h2></div></div>
        {isSimple ? (
          <label>学習内容の概要 <span className="required-label">必須</span><textarea className="toc-textarea summary-textarea" defaultValue={summarySampleText} /><span className="field-counter">{summarySampleText.length.toLocaleString()} / 8,000文字</span><span className="field-note">詳しい目次がないため、一般的な学習順序をもとに大まかなWBSを提案します。</span></label>
        ) : (
          <>
            <div className="material-mode-tabs two-options" role="tablist" aria-label="目次の入力方法"><button className={materialMode === "image" ? "material-mode active" : "material-mode"} onClick={() => setMaterialMode("image")} type="button">画像から読み取る</button><button className={materialMode === "text" ? "material-mode active" : "material-mode"} onClick={() => setMaterialMode("text")} type="button">目次を直接入力</button></div>
            <label>教材名（任意）<input defaultValue="徹底攻略 Java SE 17 Silver 問題集" maxLength={100} /></label>
            {materialMode === "image" ? (
              <div className="ocr-workflow"><div className="upload-area"><div className="panel-header compact-header"><div><strong>目次画像</strong><p>スクリーンショットまたは画像をページ順に追加します。最大10枚です。</p></div><span className="badge neutral">10 / 10枚・19.0MB</span></div><button className="secondary-button" type="button">画像を追加</button><div className="ocr-file-grid">{tocImageFiles.map(([name, size], index) => <div className="ocr-file-row" key={name}><span className="ocr-page-number">{index + 1}</span><button className="ocr-file-name" onClick={() => setPreviewPage(index + 1)} type="button"><strong>{name}</strong><small>{size}</small></button><span className={ocrStatus === "complete" ? "badge good" : "badge neutral"}>{ocrStatus === "complete" ? "完了" : "待機中"}</span><button className="text-button" type="button">順番</button><button className="text-button danger-text" type="button">削除</button></div>)}</div>{ocrStatus === "uploaded" && <button className="primary-button" onClick={startOcr} type="button">10枚の目次を読み取る</button>}</div>{ocrStatus === "reading" && <div className="ocr-status-card reading" role="status"><strong>目次を読み取っています</strong><div className="ocr-progress"><span /></div></div>}{ocrStatus === "complete" && <div className="ocr-result"><div className="ocr-result-summary"><strong>読み取り完了</strong><div className="badge-list"><span className="badge neutral">10ページ</span><span className="badge neutral">8章</span><span className="badge neutral">約40項目</span></div></div><div className="ocr-result-editor-heading"><strong>読み取った目次</strong><button className="secondary-button" onClick={openOcrEditor} type="button">編集</button></div><pre aria-label="読み取った目次のプレビュー" className="ocr-result-preview" tabIndex={0}>{ocrText}</pre><span className="field-counter">{ocrText.length.toLocaleString()} / 20,000文字</span><span className="field-hint">内容を変更する場合は、右上の「編集」を押してください。</span><div className="ocr-result-actions"><button className="secondary-button" onClick={startOcr} type="button">もう一度読み取る</button><span>この修正済みテキストだけをOpenAIへ送信します。</span></div></div>}</div>
            ) : <label>目次 <span className="required-label">必須</span><textarea className="toc-textarea" onChange={(event) => setDirectText(event.target.value)} value={directText} /><span className="field-counter">{directText.length.toLocaleString()} / 20,000文字</span></label>}
          </>
        )}

        {previewPage !== null && (
          <div aria-label={`目次画像 ${previewPage}ページ目を表示`} aria-modal="true" className="image-preview-backdrop" onClick={() => setPreviewPage(null)} role="dialog">
            <div className="image-preview-dialog" onClick={(event) => event.stopPropagation()}>
              <div className="image-preview-header">
                <div><strong>目次_{String(previewPage).padStart(2, "0")}.png</strong><span>{previewPage} / 10ページ</span></div>
                <button aria-label="画像プレビューを閉じる" className="close-button" onClick={() => setPreviewPage(null)} type="button">×</button>
              </div>
              <div className="image-preview-stage"><div className="mock-book-page"><span className="mock-book-label">Flutter開発入門</span><h3>CONTENTS</h3><div className="mock-book-rule" /><strong>Chapter {previewPage} {previewChapterTitles[previewPage - 1]}</strong><ol><li>{previewPage}-1 基本概念を理解する</li><li>{previewPage}-2 実装方法を確認する</li><li>{previewPage}-3 練習問題を解く</li></ol><span className="mock-page-number">{24 + previewPage}</span></div></div>
              <div className="image-preview-footer"><button className="secondary-button" disabled={previewPage === 1} onClick={() => setPreviewPage((page) => page && page - 1)} type="button">前の画像</button><span>{previewPage} / 10ページ</span><button className="secondary-button" disabled={previewPage === 10} onClick={() => setPreviewPage((page) => page && page + 1)} type="button">次の画像</button></div>
            </div>
          </div>
        )}

        {showOcrEditor && (
          <div aria-label="読み取った目次を編集" aria-modal="true" className="image-preview-backdrop" onClick={() => setShowOcrEditor(false)} role="dialog">
            <div className="ocr-editor-dialog" onClick={(event) => event.stopPropagation()}>
              <div className="image-preview-header"><div><strong>読み取った目次を編集</strong><span>10ページ・8章・約40項目</span></div><button aria-label="目次編集を閉じる" className="close-button" onClick={() => setShowOcrEditor(false)} type="button">×</button></div>
              <div className="ocr-editor-modal-body"><div className="ocr-editor-guide"><strong>修正ポイント</strong><span>誤字、章・節の改行、不要なページ番号を確認してください。</span></div><textarea aria-label="読み取った目次" className="ocr-modal-textarea" onChange={(event) => setOcrDraft(event.target.value)} value={ocrDraft} /></div>
              <div className="ocr-editor-modal-footer"><span>「編集を完了」を押すとプレビューへ反映されます。</span><button className="primary-button" onClick={applyOcrEdit} type="button">編集を完了</button></div>
            </div>
          </div>
        )}

        <p className="form-helper">
          入力はまだ保存されていません。生成後、WBS下書きの名称・期間・工数を確認してから保存します。
        </p>
        <div className="form-submit-bar">
          <button className="secondary-button" onClick={() => onMove("aiPlanMethod")} type="button">作成方法へ戻る</button>
          <button
            className="primary-button"
            disabled={!canGenerate}
            onClick={() => onMove("aiPlanDraft")}
            type="button"
          >
            WBS下書きを生成
          </button>
        </div>
      </div>
    </section>
  );
};

const AiPlanTaskEditPanel = ({
  task,
  parentTasks,
  hasChildren,
  onClose,
  onSave,
  onDelete,
}: {
  task: AiPlanTask;
  parentTasks: AiPlanTask[];
  hasChildren: boolean;
  onClose: () => void;
  onSave: (updated: AiPlanTask) => void;
  onDelete: (taskId: string) => void;
}) => {
  const [taskType, setTaskType] = useState<"parent" | "task">(task.plannedHours === 0 ? "parent" : "task");
  const [name, setName] = useState(task.name);
  const [parentId, setParentId] = useState<string | null>(task.parentId);
  const [startDate, setStartDate] = useState(task.plannedStartDate || "2026-06-08");
  const [endDate, setEndDate] = useState(task.plannedEndDate || "2026-06-15");
  const [hours, setHours] = useState(String(task.plannedHours > 0 ? task.plannedHours : 3));

  const wasParent = task.plannedHours === 0;
  const convertingParentToTask = wasParent && taskType === "task";

  const handleSave = () => {
    if (taskType === "parent") {
      onSave({ ...task, name, plannedHours: 0, parentId: null, level: 0, plannedStartDate: "", plannedEndDate: "" });
    } else {
      const newParentId = parentId === task.id ? null : parentId;
      onSave({
        ...task,
        name,
        plannedHours: Math.max(0.25, Number(hours) || 0.25),
        parentId: newParentId,
        level: newParentId ? 1 : 0,
        plannedStartDate: startDate,
        plannedEndDate: endDate,
      });
    }
  };

  return (
    <aside className="task-side-panel" onClick={(event) => event.stopPropagation()}>
      <div className="side-panel-title-row">
        <label>
          タスク名
          <input maxLength={100} onChange={(e) => setName(e.target.value)} value={name} />
        </label>
        <button aria-label="閉じる" className="icon-button muted" onClick={onClose} type="button">×</button>
      </div>

      <label>
        タスク種別
        <select onChange={(e) => setTaskType(e.target.value as "parent" | "task")} value={taskType}>
          <option value="parent">親タスク（見出し）</option>
          <option value="task">タスク（予定・実績あり）</option>
        </select>
      </label>

      {taskType === "task" ? (
        <>
          <label>
            親タスク
            <select onChange={(e) => setParentId(e.target.value || null)} value={parentId ?? ""}>
              <option value="">親なし</option>
              {parentTasks.filter((p) => p.id !== task.id).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              予定開始日
              <input onChange={(e) => setStartDate(e.target.value)} type="date" value={startDate} />
            </label>
            <label>
              予定終了日
              <input onChange={(e) => setEndDate(e.target.value)} type="date" value={endDate} />
            </label>
          </div>
          <label>
            予定工数
            <span className="input-with-unit">
              <input min="0.25" onChange={(e) => setHours(e.target.value)} step="0.25" type="number" value={hours} />
              <span>時間</span>
            </span>
          </label>
        </>
      ) : (
        <div className="side-panel-section">
          <strong>親タスクの扱い</strong>
          <p>章や単元をまとめる見出しです。予定・実績・進捗は配下タスクで管理します。</p>
        </div>
      )}

      {convertingParentToTask && hasChildren && (
        <div className="constraint-box">
          <strong>配下タスクの親タスクが解除されます</strong>
          <p>この親タスクをタスクに変更すると、配下タスクの親タスク設定が解除されて親なしになります。</p>
        </div>
      )}

      <div className="side-panel-actions">
        <button className="primary-button" onClick={handleSave} type="button">保存</button>
        <button className="secondary-button" onClick={onClose} type="button">キャンセル</button>
        <button
          className="secondary-button danger-text"
          onClick={() => onDelete(task.id)}
          type="button"
        >
          削除
        </button>
      </div>
    </aside>
  );
};

const AiPlanDraft = ({ onMove }: { onMove: (screen: Screen) => void }) => {
  const [planTasks, setPlanTasks] = useState<AiPlanTask[]>(aiPlanTasks);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const sortedTasks = useMemo(() => {
    const parents = planTasks.filter((t) => t.plannedHours === 0);
    const orphans = planTasks.filter((t) => t.plannedHours > 0 && t.parentId === null);
    return [
      ...parents.flatMap((parent) => [
        parent,
        ...planTasks.filter((t) => t.parentId === parent.id),
      ]),
      ...orphans,
    ];
  }, [planTasks]);

  const editingTask = editingTaskId ? planTasks.find((t) => t.id === editingTaskId) ?? null : null;
  const workTasks = planTasks.filter((t) => t.plannedHours > 0);
  const totalHours = workTasks.reduce((sum, t) => sum + t.plannedHours, 0);
  const parentTasksForSelect = planTasks.filter((t) => t.plannedHours === 0);
  const validationErrors: string[] = [];
  const validationNotices: string[] = [];
  const canCreateProject = validationErrors.length === 0;

  const updateTask = (updated: AiPlanTask) => {
    setPlanTasks((current) => {
      const prev = current.find((t) => t.id === updated.id);
      if (prev && prev.plannedHours === 0 && updated.plannedHours > 0) {
        return current.map((t) => {
          if (t.id === updated.id) return updated;
          if (t.parentId === updated.id) return { ...t, parentId: null, level: 0 };
          return t;
        });
      }
      return current.map((t) => (t.id === updated.id ? updated : t));
    });
    setEditingTaskId(null);
  };

  const deleteTask = (taskId: string) => {
    const task = planTasks.find((t) => t.id === taskId);
    if (!task) return;
    const childCount = planTasks.filter((t) => t.parentId === taskId).length;
    const message = childCount > 0
      ? `「${task.name}」と配下タスク${childCount}件を削除しますか？`
      : `「${task.name}」を削除しますか？`;
    if (!window.confirm(message)) return;
    setPlanTasks((current) =>
      current.filter((t) => t.id !== taskId && t.parentId !== taskId),
    );
    setEditingTaskId(null);
  };

  return (
    <section className="screen-grid ai-plan-flow">
      <CreationFlowHeader
        description="入力した教材・学習ペース・分割単位から作ったWBS下書きです。名称、期間、階層、予定工数を保存前に確認してください。"
        steps={[
          { label: "1 作成方法", state: "done" },
          { label: "2 条件・教材", state: "done" },
          { label: "3 WBS下書き", state: "active" },
        ]}
        title="WBS下書きを確認してプロジェクトを作成"
      />

      <div className="metric-row">
        <Metric label="WBS合計" value={`${planTasks.length}件`} />
        <Metric label="タスク" value={`${workTasks.length}件`} />
        <Metric label="予定工数" value={formatHours(totalHours)} />
        <Metric label="計画期間" value="38日" tone="good" />
      </div>

      <details className="plan-generation-conditions">
        <summary>生成条件を確認</summary>
        <div>
          <span><strong>教材入力</strong> 目次テキスト・画像10枚</span>
          <span><strong>学習ペース</strong> 380ページを1日10ページ</span>
          <span><strong>分割単位</strong> 教材の章・節</span>
        </div>
      </details>

      <section className="panel wide plan-project-summary">
        <div className="panel-header">
          <div>
            <h2>プロジェクト基本情報</h2>
            <p>AIの提案をそのまま使わず、保存前に修正できます。</p>
          </div>
          <span className="badge good">期間内</span>
        </div>
        <div className="plan-summary-grid">
          <label>
            プロジェクト名
            <input defaultValue="Java Silver 合格" maxLength={100} />
          </label>
          <label className="summary-wide-field">
            概要
            <textarea className="compact-textarea" defaultValue="Java SE 17 Silverの出題範囲を、問題演習を中心に学習する。" />
          </label>
          <label>
            開始日
            <input type="date" defaultValue="2026-06-08" />
          </label>
          <label>
            目標終了日
            <input type="date" defaultValue="2026-07-15" />
          </label>
        </div>
      </section>

      <section className="panel wide">
        <div className="panel-header">
          <div>
            <h2>生成されたWBS案</h2>
            <p>タスク名・種別・親タスク・予定日・予定工数を直接編集できます。</p>
          </div>
          <div className="button-group">
            <span className="badge good">検証済み</span>
            <button className="text-button" onClick={() => onMove("aiPlanInput")} type="button">
              条件・教材を変更
            </button>
          </div>
        </div>
        <div
          className="plan-result-host"
          onClick={editingTask ? () => setEditingTaskId(null) : undefined}
        >
          <div className="data-list plan-task-list">
            {sortedTasks.length > 0 && (
              <div className="data-list-row data-list-head plan-task-row">
                <span>タスク</span>
                <span>予定期間</span>
                <span>工数</span>
                <span>操作</span>
              </div>
            )}
            {sortedTasks.map((task) => {
              const isParent = task.plannedHours === 0;
              return (
                <button
                  aria-label={`${task.name}を編集`}
                  className={[
                    "data-list-row",
                    "plan-task-row",
                    isParent ? "parent" : "leaf",
                    "clickable",
                    editingTaskId === task.id ? "selected" : "",
                  ].filter(Boolean).join(" ")}
                  key={task.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditingTaskId(task.id);
                  }}
                  type="button"
                >
                  <div className="task-title" style={{ paddingLeft: `${task.level * 24}px` }}>
                    <span className={task.parentId !== null ? "child-arrow" : "task-icon"}>
                      {isParent ? "▾" : task.parentId !== null ? "↳" : "□"}
                    </span>
                    <div>
                      <strong>{task.name}</strong>
                      <small>{task.description}</small>
                    </div>
                  </div>
                  <span>{isParent ? "親タスク" : `${formatDate(task.plannedStartDate)} - ${formatDate(task.plannedEndDate)}`}</span>
                  <span>{isParent ? "計算対象外" : formatHours(task.plannedHours)}</span>
                  <span className="text-button">編集</span>
                </button>
              );
            })}
            {sortedTasks.length === 0 && (
              <div className="empty-state">生成されたWBS案はありません。</div>
            )}
          </div>
          {editingTask && (
            <AiPlanTaskEditPanel
              task={editingTask}
              parentTasks={parentTasksForSelect}
              hasChildren={planTasks.some((t) => t.parentId === editingTask.id)}
              onClose={() => setEditingTaskId(null)}
              onSave={updateTask}
              onDelete={deleteTask}
            />
          )}
        </div>
      </section>

      {validationErrors.length > 0 && (
        <section className="plan-validation-message error" role="alert">
          <strong>保存前に修正が必要です</strong>
          <ul>{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul>
        </section>
      )}

      {validationNotices.length > 0 && (
        <section className="plan-validation-message notice">
          <strong>確認事項</strong>
          <ul>{validationNotices.map((notice) => <li key={notice}>{notice}</li>)}</ul>
        </section>
      )}

      <div className="plan-approval-actions">
        <button className="text-button" onClick={() => onMove("aiPlanInput")} type="button">
          条件・教材を変更
        </button>
        <button className="primary-button" disabled={!canCreateProject} onClick={() => onMove("wbs")} type="button">
          この計画でプロジェクトを作成
        </button>
      </div>
    </section>
  );
};

const ProjectCard = ({
  project,
  onOpenProject,
}: {
  project: Project;
  onOpenProject: (projectId: string, screen?: Screen) => void;
}) => {
  const summary = buildProjectSummary(project, tasks, studyLogs);

  return (
    <article className="project-card">
      <div>
        <StatusPill status={project.status} />
        <h3>{project.name}</h3>
        <p>{project.summary}</p>
      </div>
      <ProgressBar value={summary.progress} />
      <div className="card-meta">
        <span>{formatHours(summary.actualHours)} / {formatHours(summary.plannedHours)}</span>
        <span>{formatDate(project.startDate)} - {formatDate(project.targetEndDate)}</span>
      </div>
      <button className="secondary-button" onClick={() => onOpenProject(project.id)} type="button">
        詳細を見る
      </button>
    </article>
  );
};

const TaskList = ({
  tasks: taskList,
  project,
  compact = false,
  editable = false,
}: {
  tasks: WbsTask[];
  project: Project;
  compact?: boolean;
  editable?: boolean;
}) => (
  <div className={compact ? "task-list compact" : "task-list"}>
    {taskList.map((task) => {
      const summary = buildTaskSummary(task, project, tasks, studyLogs);
      const level = getTaskLevel(task, tasks);
      const isParent = !isWorkTask(task, tasks);
      return (
        <article className={isParent ? "task-row parent" : "task-row leaf"} key={task.id}>
          <div className="task-title" style={{ paddingLeft: `${level * 22}px` }}>
            <span className="task-icon">{isParent ? "▾" : "□"}</span>
            <div>
              <strong>{task.name}</strong>
              {!compact && <small>{isParent ? "親タスク（見出し）" : "タスク"}</small>}
            </div>
          </div>
          <span>{isParent ? "配下タスクで管理" : `${formatDate(summary.plannedStartDate)} - ${formatDate(summary.plannedEndDate)}`}</span>
          {!compact && <span>{isParent ? "計算対象外" : `${formatHours(summary.actualHours)} / ${formatHours(summary.plannedHours)}`}</span>}
          <span>{isParent ? "—" : <ProgressBar value={summary.progress} />}</span>
          {!compact && (isParent ? <span className="badge neutral">見出し</span> : <StatusPill status={summary.status} />)}
          <span className="badge-list">
            {!isParent && summary.isDelayed && <span className="badge danger">遅延</span>}
            {!isParent && summary.isOutOfProjectRange && <span className="badge warning">期間外</span>}
            {editable && isParent && <span className="badge neutral">予定入力なし</span>}
          </span>
        </article>
      );
    })}
  </div>
);

const Metric = ({
  label,
  value,
  tone = "normal",
  help,
  statusLabel,
}: {
  label: string;
  value: string;
  tone?: MetricTone;
  help?: string[];
  statusLabel?: string;
}) => (
  <div className={`metric-card ${tone}`}>
    <span className="metric-label">
      {label}
      {help && (
        <span className="metric-help" tabIndex={0} aria-label={`${label}の説明`}>
          ?
          <span className="metric-tooltip" role="tooltip">
            {help.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </span>
        </span>
      )}
    </span>
    <strong>{value}</strong>
    {statusLabel && <span className="metric-status-label">{statusLabel}</span>}
  </div>
);

const InfoHelp = ({ label, help }: { label: string; help: string[] }) => (
  <span className="info-help" tabIndex={0} aria-label={`${label}の説明`}>
    ?
    <span className="info-tooltip" role="tooltip">
      {help.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </span>
  </span>
);

const StatusPill = ({ status }: { status: Project["status"] | TaskStatus }) => (
  <span className={`status-pill ${status}`}>{getStatusLabel(status)}</span>
);

const ProgressBar = ({ value }: { value: number }) => (
  <div className="progress-wrap" aria-label={`進捗率 ${formatProgress(value)}`}>
    <div className="progress-track">
      <span className="progress-fill" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
    <span>{formatProgress(value)}</span>
  </div>
);
