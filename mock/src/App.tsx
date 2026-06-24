import { useMemo, useState } from "react";
import {
  aiPlanTasks,
  manualProject,
  projects,
  studyLogs,
  tasks,
  today,
  tocSampleText,
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
  | "aiPlanInput"
  | "aiPlanSettings"
  | "aiPlanResult";

const screenLabels: Record<Screen, string> = {
  login: "ログイン",
  signup: "アカウント登録",
  projects: "プロジェクト一覧",
  projectDetail: "プロジェクト概要",
  progressAnalysis: "進捗分析",
  projectForm: "プロジェクト作成",
  wbs: "WBS・ガント",
  studyLogs: "学習記録",
  aiPlanInput: "AI計画作成",
  aiPlanSettings: "AI計画修正",
  aiPlanResult: "AI計画確認",
};

const commonScreens: Screen[] = ["projects", "projectForm", "login", "signup"];
const projectScreens: Screen[] = [
  "projectDetail",
  "wbs",
  "studyLogs",
  "progressAnalysis",
  "aiPlanInput",
];

export const App = () => {
  const [screen, setScreen] = useState<Screen>("projects");
  const [selectedProjectId, setSelectedProjectId] = useState("java-silver");
  const [manualProjectCreated, setManualProjectCreated] = useState(false);
  const allProjects = manualProjectCreated ? [...projects, manualProject] : projects;
  const selectedProject = allProjects.find((project) => project.id === selectedProjectId) ?? projects[0];

  const visibleProjects = useMemo(
    () =>
      [...allProjects]
        .filter((project) => !project.archived)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [manualProjectCreated],
  );

  const openProject = (projectId: string, nextScreen: Screen = "projectDetail") => {
    setSelectedProjectId(projectId);
    setScreen(nextScreen);
  };

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

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">PC Web UIモック</p>
            <h1>{screenLabels[screen]}</h1>
          </div>
          <div className="topbar-actions">
            <span className="today">基準日 {today}</span>
            <button className="secondary-button" onClick={() => setScreen("login")} type="button">
              ログアウト例
            </button>
            <button className="secondary-button" type="button">
              要件メモ
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
        {screen === "aiPlanInput" && <AiPlanInput onMove={setScreen} />}
        {screen === "aiPlanSettings" && <AiPlanSettings onMove={setScreen} />}
        {screen === "aiPlanResult" && <AiPlanResult onMove={setScreen} />}
      </main>
    </div>
  );
};

const LoginScreen = ({ onMove }: { onMove: (screen: Screen) => void }) => (
  <section className="auth-layout">
    <div className="auth-hero">
      <p className="eyebrow">SCR-02</p>
      <h2>学習をプロジェクトとして管理する</h2>
      <p>
        ログイン後はプロジェクト一覧から現在取り組むプロジェクトを選び、
        その中でWBS、学習記録、進捗分析、AI学習計画を確認します。
      </p>
      <div className="auth-preview">
        <Metric label="進行中" value="1件" />
        <Metric label="遅延" value="0件" />
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
      <p className="eyebrow">SCR-01</p>
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
          <p>ログイン後のホームです。初期表示はアーカイブを除外し、更新日時の降順です。</p>
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
              <button className="create-menu-item" onClick={() => onMove("aiPlanInput")} type="button">
                AIと作成
              </button>
              <button className="create-menu-item" onClick={() => onMove("projectForm")} type="button">
                手動で作成
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="table">
        <div className="table-row table-head">
          <span>プロジェクト</span>
          <span>状態</span>
          <span>期間</span>
          <span>進捗</span>
          <span>工数</span>
          <span>警告</span>
        </div>
        {list.map((project) => {
          const summary = buildProjectSummary(project, tasks, studyLogs);
          return (
            <button className="table-row clickable" key={project.id} onClick={() => onOpenProject(project.id)} type="button">
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
      </div>
      </section>
    </section>
  );
};

const ProjectOverview = ({ project, onMove }: { project: Project; onMove: (screen: Screen) => void }) => {
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  const summary = buildProjectSummary(project, tasks, studyLogs);
  const projectLogs = studyLogs.filter((log) => log.projectId === project.id);
  const projectContinuousDays = getContinuousStudyDays(projectLogs.map((log) => log.studyDate), today);
  const remainingHours = Math.max(summary.plannedHours - summary.actualHours, 0);
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

  if (projectTasks.length === 0) {
    return <EmptyProjectOverview project={project} onMove={onMove} />;
  }

  return (
    <section className="screen-grid project-detail-grid">
      <ProjectWorkspaceHeader active="projectDetail" hasNoTasks={false} onMove={onMove} project={project} />

      <div className="metric-row compact-metrics">
        <Metric label="進捗率" value={formatProgress(summary.progress)} />
        <Metric
          label="予定 / 実績（残）"
          value={`${formatHours(summary.plannedHours)} / ${formatHours(summary.actualHours)}（残 ${formatHours(remainingHours)}）`}
          tone={hasCostOverrun ? "danger" : "normal"}
        />
        <Metric label="プロジェクト学習時間" value={formatHours(summary.actualHours)} />
        <Metric label="プロジェクト連続日数" value={`${projectContinuousDays}日`} tone={projectContinuousDays > 0 ? "good" : "normal"} />
      </div>

      <section className="panel wide project-overview-panel">
        <div className="panel-header">
          <h2>警告</h2>
          <span className="badge neutral">概要</span>
        </div>
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

      <section className="panel wide project-overview-panel">
        <div className="panel-header">
          <h2>未完了タスク</h2>
          <button className="text-button" onClick={() => onMove("wbs")} type="button">
            WBSで確認
          </button>
        </div>
        <div className="incomplete-task-list">
          {incompleteTasks.slice(0, 8).map(({ task, summary: taskSummary }) => (
            <button
              className={taskSummary.isDelayed ? "incomplete-task-row delayed" : "incomplete-task-row"}
              key={task.id}
              onClick={() => onMove("wbs")}
              type="button"
            >
              <span>
                <strong>{task.name}</strong>
                {taskSummary.isDelayed && <span className="badge warning">遅延</span>}
              </span>
              <span>終了予定 {formatDate(taskSummary.plannedEndDate)}</span>
              <span>{formatProgress(taskSummary.progress)}</span>
            </button>
          ))}
          {incompleteTasks.length === 0 && (
            <div className="empty-state">未完了タスクはありません。</div>
          )}
        </div>
      </section>

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

    <div className="metric-row compact-metrics">
      <Metric label="進捗率" value="-" />
      <Metric label="予定 / 実績" value="- / 0h" />
      <Metric label="WBSタスク" value="0件" />
      <Metric label="プロジェクト状態" value="未着手" />
    </div>

    <section className="panel wide empty-project-onboarding">
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

const projectTabItems: Array<{
  label: string;
  screen: Screen;
  mvp: 1 | 2 | 3;
}> = [
  { label: "概要", screen: "projectDetail", mvp: 1 },
  { label: "WBS", screen: "wbs", mvp: 1 },
  { label: "学習記録", screen: "studyLogs", mvp: 1 },
  { label: "進捗分析", screen: "progressAnalysis", mvp: 2 },
  { label: "AI計画", screen: "aiPlanInput", mvp: 3 },
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
}) => (
  <header className="project-workspace-header">
    <div className="project-workspace-identity">
      <div className="project-workspace-copy">
        <p className="eyebrow">選択中プロジェクト</p>
        <div className="project-workspace-name-row">
          <h2>{project.name}</h2>
          <StatusPill status={project.status} />
        </div>
        <p>{project.summary}</p>
      </div>
      <div className="project-workspace-meta" aria-label="プロジェクト期間と表示状態">
        <span>{formatDate(project.startDate)} - {formatDate(project.targetEndDate)}</span>
        <span className="badge neutral">{project.archived ? "アーカイブ中" : "通常表示"}</span>
      </div>
    </div>
    <ProjectSectionTabs active={active} hasNoTasks={hasNoTasks} onMove={onMove} />
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
        <EvmPanel project={project} />
      </section>
    </section>
  );
};

const dayWidth = 34;
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

const formatSignedHours = (value: number) => {
  const absoluteValue = Math.abs(value);
  const formatted = formatHours(absoluteValue);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
};

const formatDayDifference = (value: number) => `${Math.abs(Math.round(value * 10) / 10).toFixed(1)}日`;

const formatNullableIndex = (value: number | null) => (value === null ? "-" : value.toFixed(2));

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
  const fixedColumns = "280px 64px 64px 84px";
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
    <div className="gantt-board">
      <div className="gantt-fixed-pane">
        <div className="gantt-row gantt-head gantt-fixed-row" style={{ gridTemplateColumns: fixedColumns }}>
          <span>件名</span>
          <span>予定(h)</span>
          <span>実績(h)</span>
          <span>進捗</span>
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
              className="gantt-task-name"
              onClick={(event) => {
                event.stopPropagation();
                onSelectTask(task.id);
              }}
              style={{ paddingLeft: `${level * 22 + 12}px` }}
              type="button"
            >
              <span className="task-icon">{isParent ? "▾" : "□"}</span>
              <span>{task.name}</span>
              {isParent && <span className="gantt-task-type">親タスク</span>}
            </button>
            <div className="gantt-hour-cell">
              {isParent ? (
                <span className="gantt-empty-value">—</span>
              ) : (
                <button className="gantt-hour-value" onClick={() => setOpenHourEditor({ taskId: task.id, field: "planned" })} type="button">
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
              <select defaultValue={Math.round(summary.progress / 10) * 10}>
                {Array.from({ length: 11 }, (_, index) => index * 10).map((progress) => (
                  <option key={progress} value={progress}>{progress}%</option>
                ))}
              </select>
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
                    {formatIntegerProgress(summary.progress)}
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

const EvmPanel = ({ project }: { project: Project }) => {
  const summary = buildProjectSummary(project, tasks, studyLogs);
  const pv: number = 8.4;
  const ev = Math.round((summary.plannedHours * summary.progress) / 100 * 100) / 100;
  const ac = summary.actualHours;
  const sv = ev - pv;
  const cv = ev - ac;
  const spi = pv === 0 ? null : ev / pv;
  const cpi = ac === 0 ? null : ev / ac;
  const spiEvaluation = getIndexEvaluation(spi, "遅れ");
  const cpiEvaluation = getIndexEvaluation(cpi, "超過");
  const burndownEvaluation = getBurndownEvaluation(project, summary.plannedHours, pv, ev);

  return (
    <div className="evm-layout">
      <div className="evm-metrics">
        <Metric label="BAC" value={formatHours(summary.plannedHours)} help={evmHelp.BAC} />
        <Metric label="PV" value={formatHours(pv)} help={evmHelp.PV} />
        <Metric label="EV" value={formatHours(ev)} help={evmHelp.EV} />
        <Metric label="AC" value={formatHours(ac)} help={evmHelp.AC} />
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
        <div className={`burndown-message ${burndownEvaluation.tone}`}>
          <strong>{burndownEvaluation.message}</strong>
          <InfoHelp label="バーンダウン差分" help={burndownEvaluation.help} />
        </div>
        <div className="chart-line ideal" />
        <div className="chart-line actual" />
        <span className="chart-label start">BAC</span>
        <span className="chart-label end">0h</span>
        <p>バーンダウンの理想線と実績線のサイズ感確認用です。</p>
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
  <section className="manual-project-form-layout">
    <div className="panel form-panel manual-project-form">
      <div className="panel-header">
        <div>
          <p className="eyebrow">SCR-05</p>
          <h2>プロジェクトを手動で作成</h2>
          <p>まずプロジェクトの目的と期間を登録します。WBSは作成後に1から追加します。</p>
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
      <p className="form-helper">新規プロジェクトは「未着手」で作成されます。</p>
      <div className="button-group">
        <button className="primary-button" onClick={onCreate} type="button">プロジェクトを作成</button>
        <button className="secondary-button" onClick={onCancel} type="button">キャンセル</button>
      </div>
    </div>

    <aside className="panel manual-create-guide">
      <h2>作成後の流れ</h2>
      <div className="manual-flow-list">
        <div className="manual-flow-step active">
          <span>1</span>
          <div><strong>プロジェクトを作成</strong><small>目的と期間を登録</small></div>
        </div>
        <div className="manual-flow-step">
          <span>2</span>
          <div><strong>WBSを作成</strong><small>親タスクとタスクを追加</small></div>
        </div>
        <div className="manual-flow-step">
          <span>3</span>
          <div><strong>予定を設定</strong><small>予定日と予定工数を入力</small></div>
        </div>
      </div>
      <div className="constraint-box neutral-box">
        <strong>この画面ではWBSを作成しません</strong>
        <p>保存後のプロジェクト概要からWBS画面へ進み、学習内容を自分で分解します。</p>
      </div>
    </aside>
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
            <button className="secondary-button" disabled={isEmpty} type="button">表示期間</button>
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
          <div className="log-list">
            {projectLogs.map((log) => {
              const task = tasks.find((item) => item.id === log.taskId);

              return (
                <article
                  aria-label={`${formatDate(log.studyDate)} ${task?.name ?? "タスク未設定"}の学習記録を編集`}
                  className="log-item clickable-log-item"
                  key={log.id}
                  onClick={() => {
                    setPanelState({ mode: "edit", log });
                    setSaveNotice("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setPanelState({ mode: "edit", log });
                      setSaveNotice("");
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="log-item-main">
                    <strong>{formatDate(log.studyDate)} / {formatHours(log.hours)}</strong>
                    <span>{task?.name}</span>
                    <p>{log.memo}</p>
                  </div>
                  <div className="badge-list">
                    <span className="text-button">編集</span>
                  </div>
                </article>
              );
            })}
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

const AiPlanInput = ({ onMove }: { onMove: (screen: Screen) => void }) => {
  const [materialMode, setMaterialMode] = useState<"text" | "image" | "summary">("text");

  return (
    <section className="screen-grid ai-plan-flow">
      <div className="panel wide">
        <div className="stepper">
          <span className="step-item active">1 条件・教材入力</span>
          <span className="step-item">2 計画案を確認</span>
          <span className="step-item">3 承認して作成</span>
        </div>
      </div>

      <div className="hero-card ai-hero">
        <div>
          <p className="eyebrow">AIと作成</p>
          <h2>学習条件と教材から、実行できる計画案を作る</h2>
          <p>AIは下書きを作成します。プロジェクトとWBSは、内容を確認して承認するまで保存されません。</p>
        </div>
        <span className="badge neutral">未保存</span>
      </div>

      <div className="panel form-panel ai-input-main">
        <div className="section-heading">
          <span className="section-number">1</span>
          <div>
            <h2>学習目標と期間</h2>
            <p>計画のゴールと利用できる期間を指定します。</p>
          </div>
        </div>
        <label>
          学習目標 <span className="required-label">必須</span>
          <input defaultValue="Java Silverに合格する" maxLength={100} />
        </label>
        <label>
          プロジェクト名（任意）
          <input defaultValue="Java Silver 合格" maxLength={100} />
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

        <div className="section-heading">
          <span className="section-number">2</span>
          <div>
            <h2>学習可能時間</h2>
            <p>通常の1日あたり時間を入力し、例外だけ補足します。</p>
          </div>
        </div>
        <div className="availability-grid">
          <label>
            平日
            <span className="input-with-unit"><input type="number" min="0" step="0.25" defaultValue="1" /><span>時間 / 日</span></span>
          </label>
          <label>
            休日
            <span className="input-with-unit"><input type="number" min="0" step="0.25" defaultValue="2" /><span>時間 / 日</span></span>
          </label>
        </div>
        <fieldset className="weekday-fieldset">
          <legend>学習できない曜日（任意）</legend>
          <div className="weekday-options">
            {["月", "火", "水", "木", "金", "土", "日"].map((day) => (
              <label className={day === "水" ? "weekday-option selected" : "weekday-option"} key={day}>
                <input defaultChecked={day === "水"} type="checkbox" />
                {day}
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          日程の補足（任意）
          <textarea className="compact-textarea" defaultValue="6月20日と21日は学習できない。試験前の1週間は平日も2時間確保できる。" />
        </label>

        <div className="section-divider" />

        <div className="section-heading">
          <span className="section-number">3</span>
          <div>
            <h2>教材情報</h2>
            <p>最も入力しやすい方法を1つ選択します。</p>
          </div>
        </div>
        <div className="material-mode-tabs" role="tablist" aria-label="教材入力方法">
          <button className={materialMode === "text" ? "material-mode active" : "material-mode"} onClick={() => setMaterialMode("text")} type="button">
            目次テキスト
          </button>
          <button className={materialMode === "image" ? "material-mode active" : "material-mode"} onClick={() => setMaterialMode("image")} type="button">
            目次画像
          </button>
          <button className={materialMode === "summary" ? "material-mode active" : "material-mode"} onClick={() => setMaterialMode("summary")} type="button">
            教材名・概要のみ
          </button>
        </div>
        <label>
          教材名
          <input defaultValue="徹底攻略 Java SE 17 Silver 問題集" maxLength={100} />
        </label>
        {materialMode === "text" && (
          <label>
            目次テキスト <span className="required-label">必須</span>
            <textarea className="toc-textarea" defaultValue={tocSampleText} />
          </label>
        )}
        {materialMode === "image" && (
          <div className="upload-area">
            <strong>目次画像を追加</strong>
            <p>jpg、jpeg、png、webp / 最大10枚</p>
            <button className="secondary-button" type="button">画像を選択</button>
            <div className="upload-file-list">
              <span>目次_01.png <small>2.4MB</small></span>
              <span>目次_02.png <small>1.8MB</small></span>
            </div>
            <div className="ocr-preview">
              <strong>OCR結果を確認・修正</strong>
              <textarea defaultValue={tocSampleText} />
            </div>
          </div>
        )}
        {materialMode === "summary" && (
          <label>
            教材の概要 <span className="required-label">必須</span>
            <textarea defaultValue="Java SE 17 Silver向けの問題集。文法、クラス、継承、例外、コレクション、模擬問題を扱う。" />
            <span className="field-note">目次がないため、生成されるWBSは大まかな案になります。</span>
          </label>
        )}

        <div className="section-divider" />

        <div className="section-heading">
          <span className="section-number">4</span>
          <div>
            <h2>学習方針</h2>
            <p>優先順位や除外条件がある場合だけ指定します。</p>
          </div>
        </div>
        <div className="form-row">
          <label>
            重点的に学ぶ範囲
            <textarea className="compact-textarea" defaultValue="クラス、継承、例外処理は問題演習を多めにする。" />
          </label>
          <label>
            軽く確認・除外する範囲
            <textarea className="compact-textarea" defaultValue="Javaの実行環境の説明は理解済みなので短くする。" />
          </label>
        </div>

        <div className="form-submit-bar">
          <button className="secondary-button" onClick={() => onMove("projectForm")} type="button">作成方法へ戻る</button>
          <button className="primary-button" onClick={() => onMove("aiPlanResult")} type="button">計画案を生成</button>
        </div>
      </div>

      <aside className="panel ai-input-summary">
        <h2>AIへ送信する内容</h2>
        <div className="send-summary-list">
          <span><strong>目標</strong> Java Silverに合格する</span>
          <span><strong>期間</strong> 6/8 - 7/15</span>
          <span><strong>学習時間</strong> 平日1h / 休日2h</span>
          <span><strong>教材</strong> 教材名と確認済み目次</span>
          <span><strong>方針</strong> 重点・軽減範囲、日程補足</span>
        </div>
        <div className="constraint-box neutral-box">
          <strong>生成後の扱い</strong>
          <p>計画案は未保存の下書きです。内容を確認し、「この計画で作成」を押すまで登録されません。</p>
        </div>
        <div className="constraint-box">
          <strong>入力内容は保持</strong>
          <p>生成に失敗した場合も、この画面の入力内容を保持したまま再試行します。</p>
        </div>
      </aside>
    </section>
  );
};

const AiPlanSettings = ({ onMove }: { onMove: (screen: Screen) => void }) => (
  <section className="screen-grid ai-plan-flow">
    <div className="panel wide">
      <div className="stepper">
        <span className="step-item done">1 条件・教材入力</span>
        <span className="step-item active">2 計画案を確認</span>
        <span className="step-item">3 承認して作成</span>
      </div>
    </div>

    <div className="panel form-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">SCR-14</p>
          <h2>AIへ計画修正を依頼</h2>
          <p>元の計画は変更せず、修正案と差分を確認します。</p>
        </div>
      </div>
      <div className="chat-thread">
        <article className="chat-message user-message">
          <strong>ユーザー</strong>
          <p>6月20日と6月21日は勉強できなくなった。期限はそのままでスケジュールを修正して。</p>
        </article>
        <article className="chat-message ai-message">
          <strong>AI</strong>
          <p>第2章の演習を6月22日から6月24日に移動し、模擬問題の復習時間を0.5時間短縮する案です。</p>
        </article>
      </div>
      <div className="change-preview">
        <h3>変更差分</h3>
        <div className="diff-row">
          <span>継承とポリモーフィズムを演習する</span>
          <strong>6/20-6/23 → 6/22-6/25</strong>
        </div>
        <div className="diff-row">
          <span>模擬問題と弱点復習</span>
          <strong>6h → 5.5h</strong>
        </div>
      </div>
      <label>
        追加依頼
        <textarea defaultValue="この修正案で、1日の学習時間が2時間を超えないように再調整して。" />
      </label>
      <div className="button-group">
        <button className="primary-button" onClick={() => onMove("aiPlanResult")} type="button">
          この修正案を計画案へ反映
        </button>
        <button className="secondary-button" onClick={() => onMove("aiPlanResult")} type="button">
          破棄して計画案へ戻る
        </button>
      </div>
    </div>

    <aside className="panel">
      <h2>変更の確認</h2>
      <ul className="check-list">
        <li>変更対象のタスクが分かる</li>
        <li>予定日・予定工数の変更前後が分かる</li>
        <li>期限や1日の学習可能時間を超えていない</li>
      </ul>
      <div className="constraint-box neutral-box">
        <strong>反映ルール</strong>
        <p>
          AIの修正案は直接保存しません。ユーザーが差分を確認し、反映を選んだ場合だけWBSと予定へ適用します。
        </p>
      </div>
    </aside>
  </section>
);

const AiPlanResult = ({ onMove }: { onMove: (screen: Screen) => void }) => {
  const workTasks = aiPlanTasks.filter((task) => task.plannedHours > 0);
  const totalHours = workTasks.reduce((sum, task) => sum + task.plannedHours, 0);

  return (
    <section className="screen-grid ai-plan-flow">
      <div className="panel wide">
        <div className="stepper">
          <span className="step-item done">1 条件・教材入力</span>
          <span className="step-item active">2 計画案を確認</span>
          <span className="step-item">3 承認して作成</span>
        </div>
      </div>

      <div className="hero-card plan-review-hero">
        <div>
          <p className="eyebrow">SCR-15</p>
          <h2>AIが作成した計画案を確認</h2>
          <p>名称、期間、WBS、予定工数を確認してください。この時点ではまだ保存されていません。</p>
        </div>
        <span className="badge neutral">未保存の計画案</span>
      </div>

      <div className="metric-row">
        <Metric label="生成WBS" value={`${aiPlanTasks.length}件`} />
        <Metric label="タスク" value={`${workTasks.length}件`} />
        <Metric label="予定工数" value={formatHours(totalHours)} />
        <Metric label="計画期間" value="38日" tone="good" />
      </div>

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
            <p>各行を直接編集するか、AIへまとめて修正を依頼できます。</p>
          </div>
          <button className="secondary-button" onClick={() => onMove("aiPlanSettings")} type="button">
            AIへ修正を依頼
          </button>
        </div>
        <div className="plan-task-list">
          {aiPlanTasks.map((task) => (
            <article className={task.plannedHours === 0 ? "plan-task-row parent" : "plan-task-row leaf"} key={task.id}>
              <div className="task-title" style={{ paddingLeft: `${task.level * 24}px` }}>
                <span className="task-icon">{task.plannedHours === 0 ? "▾" : "□"}</span>
                <div>
                  <strong>{task.name}</strong>
                  <small>{task.description}</small>
                </div>
              </div>
              <span>{task.plannedHours === 0 ? "親タスク" : `${formatDate(task.plannedStartDate)} - ${formatDate(task.plannedEndDate)}`}</span>
              <span>{task.plannedHours === 0 ? "計算対象外" : formatHours(task.plannedHours)}</span>
              <button className="text-button" type="button">編集</button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>計画チェック</h2>
        <div className="plan-check-list">
          <span className="plan-check ok"><strong>期間</strong> 目標終了日までに完了</span>
          <span className="plan-check ok"><strong>学習量</strong> 平日1h・休日2h以内</span>
          <span className="plan-check ok"><strong>WBS</strong> 親タスクとタスクの2階層</span>
          <span className="plan-check warning"><strong>確認</strong> 模擬試験は1回のみ</span>
        </div>
        <button className="secondary-button full-width-button" onClick={() => onMove("aiPlanSettings")} type="button">
          AIへ計画修正を依頼
        </button>
      </section>

      <section className="panel">
        <h2>作成する内容</h2>
        <ul className="check-list">
          <li>プロジェクトを未着手で作成</li>
          <li>親タスクとタスクをまとめて保存</li>
          <li>全タスクの進捗率を0%で作成</li>
        </ul>
        <div className="approval-box">
          <label className="checkbox-label">
            <input type="checkbox" defaultChecked />
            プロジェクト情報とWBS案を確認しました
          </label>
          <button className="primary-button full-width-button" onClick={() => onMove("wbs")} type="button">
            この計画でプロジェクトを作成
          </button>
          <button className="text-button full-width-button" onClick={() => onMove("aiPlanInput")} type="button">
            入力条件から見直す
          </button>
        </div>
      </section>
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
