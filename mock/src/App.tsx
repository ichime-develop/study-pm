import { useMemo, useState } from "react";
import {
  aiAnswers,
  aiPlanTasks,
  projects,
  questions,
  studyLogs,
  tasks,
  today,
  tocSampleText,
  type Project,
  type QuestionStatus,
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
  | "dashboard"
  | "projects"
  | "projectDetail"
  | "progressAnalysis"
  | "projectForm"
  | "wbs"
  | "questions"
  | "questionForm"
  | "aiContext"
  | "aiPlanInput"
  | "aiPlanSettings"
  | "aiPlanResult";

const screenLabels: Record<Screen, string> = {
  login: "ログイン",
  signup: "アカウント登録",
  dashboard: "ダッシュボード",
  projects: "プロジェクト一覧",
  projectDetail: "プロジェクト詳細",
  progressAnalysis: "進捗分析",
  projectForm: "プロジェクト作成・編集",
  wbs: "WBS編集",
  questions: "質問一覧",
  questionForm: "質問登録・編集",
  aiContext: "AI送信情報選択",
  aiPlanInput: "教材入力",
  aiPlanSettings: "AI計画チャット",
  aiPlanResult: "AI計画確認",
};

export const App = () => {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState("java-silver");
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];

  const visibleProjects = useMemo(
    () =>
      [...projects]
        .filter((project) => !project.archived)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [],
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
          {(Object.keys(screenLabels) as Screen[]).map((key) => (
            <button
              className={screen === key ? "nav-item active" : "nav-item"}
              key={key}
              onClick={() => setScreen(key)}
              type="button"
            >
              {screenLabels[key]}
            </button>
          ))}
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

        {screen === "dashboard" && <Dashboard onOpenProject={openProject} />}
        {screen === "login" && <LoginScreen onMove={setScreen} />}
        {screen === "signup" && <SignupScreen onMove={setScreen} />}
        {screen === "projects" && (
          <ProjectList projects={visibleProjects} onMove={setScreen} onOpenProject={openProject} />
        )}
        {screen === "projectDetail" && (
          <ProjectDetail project={selectedProject} onMove={setScreen} />
        )}
        {screen === "progressAnalysis" && <ProgressAnalysis project={selectedProject} />}
        {screen === "projectForm" && <ProjectForm project={selectedProject} onMove={setScreen} />}
        {screen === "wbs" && <WbsEditor project={selectedProject} />}
        {screen === "questions" && <QuestionList onMove={setScreen} />}
        {screen === "questionForm" && <QuestionForm onMove={setScreen} />}
        {screen === "aiContext" && <AiContextSelector onMove={setScreen} />}
        {screen === "aiPlanInput" && <AiPlanInput onMove={setScreen} />}
        {screen === "aiPlanSettings" && <AiPlanSettings onMove={setScreen} />}
        {screen === "aiPlanResult" && <AiPlanResult onMove={setScreen} />}
      </main>
    </div>
  );
};

const Dashboard = ({ onOpenProject }: { onOpenProject: (projectId: string, screen?: Screen) => void }) => {
  const activeProjects = projects.filter((project) => !project.archived && project.status === "in_progress");
  const upcomingTasks = getLeafTasks("java-silver", tasks)
    .filter((task) => task.progress < 100 && task.plannedEndDate >= today)
    .sort((a, b) => a.plannedEndDate.localeCompare(b.plannedEndDate))
    .slice(0, 5);
  const delayedTasks = getLeafTasks("java-silver", tasks).filter((task) => {
    const project = projects.find((item) => item.id === task.projectId)!;
    return buildTaskSummary(task, project, tasks, studyLogs).isDelayed;
  });
  const recentLogs = [...studyLogs]
    .sort((a, b) =>
      b.studyDate === a.studyDate
        ? b.updatedAt.localeCompare(a.updatedAt)
        : b.studyDate.localeCompare(a.studyDate),
    )
    .slice(0, 5);
  const unresolvedQuestions = questions
    .filter((question) => question.status !== "resolved")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  return (
    <section className="screen-grid">
      <div className="hero-card">
        <div>
          <p className="eyebrow">今日の確認</p>
          <h2>学習計画と実績を1画面で確認</h2>
          <p>
            PC Web版では、今日やるタスク、進行中プロジェクト、直近の学習記録、
            質問、AI計画作成にすぐアクセスできることを確認します。
          </p>
        </div>
        <div className="button-group">
          <button className="primary-button" onClick={() => onOpenProject("java-silver")} type="button">
            プロジェクト詳細へ
          </button>
          <button className="secondary-button" onClick={() => onOpenProject("java-silver", "aiPlanInput")} type="button">
            目次から計画作成
          </button>
        </div>
      </div>

      <div className="metric-row">
        <Metric label="進行中" value={`${activeProjects.length}件`} />
        <Metric label="今後7日の予定" value={`${upcomingTasks.length}件`} />
        <Metric label="遅延タスク" value={`${delayedTasks.length}件`} tone={delayedTasks.length > 0 ? "danger" : "normal"} />
      </div>

      <section className="panel wide">
        <div className="panel-header">
          <h2>進行中プロジェクト</h2>
          <button className="text-button" onClick={() => onOpenProject("java-silver", "projects")} type="button">
            一覧へ
          </button>
        </div>
        <div className="project-card-list">
          {activeProjects.map((project) => (
            <ProjectCard key={project.id} project={project} onOpenProject={onOpenProject} />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>今日から今後7日の予定</h2>
        </div>
        <TaskList tasks={upcomingTasks} project={projects[0]} compact />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>直近の学習記録</h2>
        </div>
        <div className="log-list">
          {recentLogs.map((log) => {
            const task = tasks.find((item) => item.id === log.taskId);
            return (
              <article className="log-item" key={log.id}>
                <strong>{formatDate(log.studyDate)} / {formatHours(log.hours)}</strong>
                <span>{task?.name}</span>
                <p>{log.memo}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>未解決・調査中の質問</h2>
        </div>
        <div className="log-list">
          {unresolvedQuestions.map((question) => (
            <article className="log-item" key={question.id}>
              <strong>{question.title}</strong>
              <span>{getQuestionStatusLabel(question.status)} / {question.category}</span>
              <p>{question.content}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
};

const LoginScreen = ({ onMove }: { onMove: (screen: Screen) => void }) => (
  <section className="auth-layout">
    <div className="auth-hero">
      <p className="eyebrow">SCR-02</p>
      <h2>学習をプロジェクトとして管理する</h2>
      <p>
        ログイン後、進行中プロジェクト、今日から今後7日のタスク、直近の学習記録を
        ダッシュボードで確認します。
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
      <button className="primary-button" onClick={() => onMove("dashboard")} type="button">
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
      <button className="primary-button" onClick={() => onMove("dashboard")} type="button">
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

  return (
    <section className="panel wide">
      <div className="panel-header">
        <div>
          <h2>プロジェクト一覧</h2>
          <p>初期表示はアーカイブを除外し、更新日時の降順です。</p>
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
                <span>AIで計画案を作るか、手動でWBSを作ります。</span>
              </div>
              <button className="create-menu-item" onClick={() => onMove("aiPlanInput")} type="button">
                AIで作成
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
                <small>{project.field}</small>
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
  );
};

const ProjectDetail = ({ project, onMove }: { project: Project; onMove: (screen: Screen) => void }) => {
  const summary = buildProjectSummary(project, tasks, studyLogs);
  const pv = 8.4;
  const ev = Math.round((summary.plannedHours * summary.progress) / 100 * 100) / 100;
  const sv = ev - pv;
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = projectTasks.find((task) => task.id === selectedTaskId) ?? null;

  return (
    <section className="screen-grid project-detail-grid">
      <div className="hero-card compact-hero">
        <div>
          <h2>{project.name}</h2>
          <p>{project.summary}</p>
        </div>
        <div className="button-group">
          <button className="secondary-button" onClick={() => onMove("progressAnalysis")} type="button">進捗分析</button>
          <button className="secondary-button" onClick={() => onMove("projectForm")} type="button">プロジェクト編集</button>
          <button className="secondary-button" onClick={() => onMove("questions")} type="button">質問一覧</button>
        </div>
      </div>

      <div className="metric-row compact-metrics">
        <Metric label="期間" value={`${formatDate(project.startDate)} - ${formatDate(project.targetEndDate)}`} />
        <Metric label="進捗率" value={formatProgress(summary.progress)} />
        <Metric label="実績 / 予定" value={`${formatHours(summary.actualHours)} / ${formatHours(summary.plannedHours)}`} />
        <Metric label="遅延タスク" value={`${summary.delayedCount}件`} tone={summary.delayedCount > 0 ? "danger" : "normal"} />
        <Metric label="SV" value={formatHours(sv)} tone={sv < 0 ? "danger" : "normal"} help={svHelp} />
      </div>

      <section className="panel wide">
        <div className="panel-header">
          <h2>WBS・ガントチャート</h2>
          <div className="button-group">
            <button className="primary-button" type="button">タスク追加</button>
            <button className="secondary-button" type="button">表示期間</button>
          </div>
        </div>
        <div className={selectedTask ? "gantt-workspace with-side-panel" : "gantt-workspace"}>
          {selectedTask && (
            <TaskSidePanel task={selectedTask} project={project} onClose={() => setSelectedTaskId(null)} />
          )}
          <GanttWbsTable
            project={project}
            selectedTaskId={selectedTask?.id ?? null}
            taskList={projectTasks}
            onSelectTask={setSelectedTaskId}
          />
        </div>
      </section>
    </section>
  );
};

const ProgressAnalysis = ({ project }: { project: Project }) => {
  const summary = buildProjectSummary(project, tasks, studyLogs);

  return (
    <section className="screen-grid">
      <div className="hero-card">
        <div>
          <p className="eyebrow">EVM / Burndown</p>
          <h2>{project.name} の進捗分析</h2>
        </div>
      </div>

      <div className="metric-row">
        <Metric label="進捗率" value={formatProgress(summary.progress)} />
        <Metric label="実績 / 予定" value={`${formatHours(summary.actualHours)} / ${formatHours(summary.plannedHours)}`} />
        <Metric label="遅延タスク" value={`${summary.delayedCount}件`} tone={summary.delayedCount > 0 ? "danger" : "normal"} />
        <Metric label="期間" value={`${formatDate(project.startDate)} - ${formatDate(project.targetEndDate)}`} />
      </div>

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

type HourField = "planned" | "actual";

const svHelp = [
  "Schedule Variance。予定との差分を時間で表します。",
  "計算式: SV = EV - PV",
  "SV < 0: 予定より遅れています。",
  "SV > 0: 予定より先行しています。",
  "SV = 0: 予定どおりです。",
];

const evmHelp: Record<string, string[]> = {
  BAC: [
    "Budget at Completion。プロジェクト全体の予定工数です。",
    "計算式: 全リーフタスクの予定工数合計",
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
    "計算式: 基準日までに記録された実績時間の合計",
    "学習に実際に使った時間を表します。",
  ],
  CV: [
    "Cost Variance。予定工数に対する効率差を時間で表します。",
    "計算式: CV = EV - AC",
    "CV < 0: 予定より時間を使っています。",
    "CV > 0: 予定より少ない時間で進んでいます。",
  ],
  SPI: [
    "Schedule Performance Index。スケジュール効率です。",
    "計算式: SPI = EV / PV",
    "SPI < 1: 予定より遅れています。",
    "SPI > 1: 予定より先行しています。",
  ],
  CPI: [
    "Cost Performance Index。本アプリでは工数効率です。",
    "計算式: CPI = EV / AC",
    "CPI < 1: 予定より時間を使っています。",
    "CPI > 1: 予定より効率よく進んでいます。",
  ],
};

const burndownHelp = [
  "残予定工数の減り方を日付ごとに確認するグラフです。",
  "理想線: プロジェクト開始日から目標終了日まで、BACが0へ減る想定線",
  "実績線: BACから日ごとのEVを差し引いた残量",
  "実績線が理想線より上にある場合、消化が遅い可能性があります。",
];

const buildTimeline = (start: string, end: string) =>
  Array.from({ length: getInclusiveDays(start, end) }, (_, index) =>
    toDateInputValue(new Date(toDate(start).getTime() + index * dayMs)),
  );

const GanttWbsTable = ({
  project,
  taskList,
  selectedTaskId,
  onSelectTask,
}: {
  project: Project;
  taskList: WbsTask[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}) => {
  const [openHourEditor, setOpenHourEditor] = useState<{ taskId: string; field: HourField } | null>(null);
  const [hourValues, setHourValues] = useState<Record<string, string>>({});
  const summaries = taskList.map((task) => ({
    task,
    summary: buildTaskSummary(task, project, tasks, studyLogs),
  }));
  const timelineStart = [project.startDate, ...summaries.map(({ summary }) => summary.plannedStartDate)].sort()[0];
  const timelineEndCandidates = [project.targetEndDate, ...summaries.map(({ summary }) => summary.plannedEndDate)].sort();
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
  const rows = summaries.map(({ task, summary }) => {
    const level = getTaskLevel(task, tasks);
    const offset = Math.round((toDate(summary.plannedStartDate).getTime() - toDate(timelineStart).getTime()) / dayMs);
    const duration = getInclusiveDays(summary.plannedStartDate, summary.plannedEndDate);
    const barLeft = offset * dayWidth + 4;
    const barWidth = Math.max(dayWidth - 8, duration * dayWidth - 8);

    return {
      task,
      summary,
      level,
      barLeft,
      barWidth,
      plannedHours: getHourValue(task.id, "planned", summary.plannedHours),
      actualHours: getHourValue(task.id, "actual", summary.actualHours),
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
        {rows.map(({ task, summary, level, plannedHours, actualHours }) => (
          <div
            className={selectedTaskId === task.id ? "gantt-row gantt-fixed-row selected" : "gantt-row gantt-fixed-row"}
            key={task.id}
            style={{ gridTemplateColumns: fixedColumns }}
          >
            <button className="gantt-task-name" onClick={() => onSelectTask(task.id)} style={{ paddingLeft: `${level * 22 + 12}px` }} type="button">
              <span className="task-icon">{summary.isLeaf ? "□" : "▾"}</span>
              <span>{task.name}</span>
            </button>
            <div className="gantt-hour-cell">
              <button className="gantt-hour-value" onClick={() => setOpenHourEditor({ taskId: task.id, field: "planned" })} type="button">
                {plannedHours}
              </button>
              {openHourEditor?.taskId === task.id && openHourEditor.field === "planned" && (
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
              <button className="gantt-hour-value" onClick={() => setOpenHourEditor({ taskId: task.id, field: "actual" })} type="button">
                {actualHours}
              </button>
              {openHourEditor?.taskId === task.id && openHourEditor.field === "actual" && (
                <div className="gantt-hour-popover" role="dialog" aria-label="実績時間を編集">
                  <label>
                    実績
                    <span className="hour-input-row">
                      <input autoFocus min="0" onChange={(event) => updateHourValue(task.id, "actual", event.target.value)} step="0.25" type="number" value={actualHours} />
                      <span>時間</span>
                    </span>
                  </label>
                  <button className="primary-button" onClick={() => setOpenHourEditor(null)} type="button">保存</button>
                </div>
              )}
            </div>
            <select defaultValue={Math.round(summary.progress / 10) * 10}>
              {Array.from({ length: 11 }, (_, index) => index * 10).map((progress) => (
                <option key={progress} value={progress}>{progress}%</option>
              ))}
            </select>
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
          {rows.map(({ task, summary, barLeft, barWidth }) => (
            <div className={selectedTaskId === task.id ? "gantt-row gantt-timeline-row selected" : "gantt-row gantt-timeline-row"} key={task.id}>
              <div className="gantt-chart-cell" style={{ backgroundSize: `${dayWidth}px 100%`, width: `${timelineWidth}px` }}>
                {showToday && <span className="today-marker" style={{ left: `${todayOffset * dayWidth}px` }} />}
                <span
                  className={`gantt-bar ${summary.status}${summary.isDelayed ? " delayed" : ""}${summary.isLeaf ? "" : " parent"}`}
                  style={{ left: `${barLeft}px`, width: `${barWidth}px` }}
                >
                  {formatIntegerProgress(summary.progress)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TaskSidePanel = ({
  task,
  project,
  onClose,
}: {
  task: WbsTask;
  project: Project;
  onClose: () => void;
}) => {
  const summary = buildTaskSummary(task, project, tasks, studyLogs);
  const relatedLogs = studyLogs.filter((log) => log.taskId === task.id);
  const relatedQuestions = questions.filter((question) => question.taskId === task.id);

  return (
    <aside className="task-side-panel">
      <div className="side-panel-header">
        <div>
          <p className="eyebrow">タスク詳細</p>
          <h3>{task.name}</h3>
        </div>
        <button className="icon-button muted" onClick={onClose} aria-label="閉じる" type="button">×</button>
      </div>

      <div className="side-panel-status">
        <StatusPill status={summary.status} />
        {summary.isDelayed && <span className="badge danger">遅延</span>}
        {summary.isOutOfProjectRange && <span className="badge warning">期間外</span>}
      </div>

      <label>
        タスク名
        <input defaultValue={task.name} maxLength={100} />
      </label>
      <label>
        説明
        <textarea defaultValue={task.description} maxLength={5000} />
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
      <div className="form-row">
        <label>
          予定工数
          <input defaultValue={summary.plannedHours} min="0.25" step="0.25" type="number" />
        </label>
        <label>
          進捗率
          <select defaultValue={Math.round(summary.progress / 10) * 10}>
            {Array.from({ length: 11 }, (_, index) => index * 10).map((progress) => (
              <option key={progress} value={progress}>{progress}%</option>
            ))}
          </select>
        </label>
      </div>

      <div className="side-panel-section">
        <strong>学習メモ</strong>
        <p>{relatedLogs.length > 0 ? `${relatedLogs.length}件のメモがあります。` : "まだメモはありません。"}</p>
        <textarea className="memo-inline-input" defaultValue="" placeholder="学習中に気づいたことを残す" />
        <button className="secondary-button" type="button">学習メモ追加</button>
      </div>
      <div className="side-panel-section">
        <strong>質問</strong>
        <p>{relatedQuestions.length > 0 ? `${relatedQuestions.length}件の質問があります。` : "関連する質問はありません。"}</p>
      </div>

      <div className="side-panel-actions">
        <button className="primary-button" type="button">保存</button>
        <button className="secondary-button" type="button">削除</button>
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

  return (
    <div className="evm-layout">
      <div className="evm-metrics">
        <Metric label="BAC" value={formatHours(summary.plannedHours)} help={evmHelp.BAC} />
        <Metric label="PV" value={formatHours(pv)} help={evmHelp.PV} />
        <Metric label="EV" value={formatHours(ev)} help={evmHelp.EV} />
        <Metric label="AC" value={formatHours(ac)} help={evmHelp.AC} />
        <Metric label="SV" value={formatHours(sv)} tone={sv < 0 ? "danger" : "normal"} help={svHelp} />
        <Metric label="CV" value={formatHours(cv)} tone={cv < 0 ? "warning" : "normal"} help={evmHelp.CV} />
        <Metric label="SPI" value={spi ? spi.toFixed(2) : "算出不可"} help={evmHelp.SPI} />
        <Metric label="CPI" value={cpi ? cpi.toFixed(2) : "算出不可"} help={evmHelp.CPI} />
      </div>
      <div className="chart-card">
        <div className="chart-card-header">
          <strong>バーンダウン</strong>
          <InfoHelp label="バーンダウン" help={burndownHelp} />
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

const ProjectForm = ({ project, onMove }: { project: Project; onMove: (screen: Screen) => void }) => (
  <section className="screen-grid">
    <div className="panel wide creation-choice">
      <div>
        <p className="eyebrow">作成方法</p>
        <h2>プロジェクトをどう作るか</h2>
        <p>実装時は、プロジェクト一覧の「新規作成」からこの選択に進む想定です。</p>
      </div>
      <div className="choice-grid">
        <button className="choice-card active-choice" type="button">
          <span>手動作成</span>
          <strong>プロジェクト情報だけ先に登録</strong>
          <small>WBSは後から自分で追加します。</small>
        </button>
        <button className="choice-card" onClick={() => onMove("aiPlanInput")} type="button">
          <span>AI作成</span>
          <strong>教材目次からWBSを生成</strong>
          <small>目次写真または貼り付けテキストから計画案を作ります。</small>
        </button>
      </div>
    </div>

    <div className="panel form-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">SCR-05</p>
          <h2>プロジェクト作成・編集</h2>
          <p>新規作成と編集で同じ入力項目を使う想定です。</p>
        </div>
      </div>
      <label>
        プロジェクト名
        <input defaultValue={project.name} maxLength={100} />
      </label>
      <label>
        学習分野
        <input defaultValue={project.field} maxLength={100} />
      </label>
      <label>
        概要
        <textarea defaultValue={project.summary} maxLength={5000} />
      </label>
      <div className="form-row">
        <label>
          開始日
          <input type="date" defaultValue={project.startDate} />
        </label>
        <label>
          目標終了日
          <input type="date" defaultValue={project.targetEndDate} />
        </label>
      </div>
      <label>
        状態
        <select defaultValue={project.status}>
          <option value="not_started">未着手</option>
          <option value="in_progress">進行中</option>
          <option value="completed">完了</option>
        </select>
      </label>
      <button className="primary-button" type="button">保存する</button>
    </div>

    <aside className="panel">
      <h2>確認ポイント</h2>
      <ul className="check-list">
        <li>名称と学習分野が100文字以内であることが分かるか</li>
        <li>開始日と目標終了日の関係が自然に入力できるか</li>
        <li>完了状態の条件をどこで説明すべきか</li>
      </ul>
      <div className="constraint-box">
        <strong>完了条件</strong>
        <p>
          プロジェクトを完了にできるのは、1件以上のリーフタスクが存在し、
          すべて100%の場合だけです。
        </p>
      </div>
      <div className="constraint-box neutral-box">
        <strong>アーカイブ</strong>
        <p>アーカイブは状態とは別に管理します。アーカイブ中は閲覧のみです。</p>
      </div>
    </aside>
  </section>
);

const WbsEditor = ({ project }: { project: Project }) => {
  const projectTasks = tasks.filter((task) => task.projectId === project.id);

  return (
    <section className="panel wide">
      <div className="panel-header">
        <div>
          <h2>{project.name} のWBS編集</h2>
          <p>上下移動とインデント・アウトデントの操作感を確認する画面です。</p>
        </div>
        <button className="primary-button" type="button">タスク追加</button>
      </div>
      <div className="wbs-toolbar">
        <button type="button">上へ</button>
        <button type="button">下へ</button>
        <button type="button">インデント</button>
        <button type="button">アウトデント</button>
      </div>
      <TaskList tasks={projectTasks} project={project} editable />
      <div className="constraint-box">
        <strong>制約の見せ方確認</strong>
        <p>
          学習記録があるリーフタスクは親タスク化できません。子タスク、学習記録、
          関連質問があるタスクは削除できません。
        </p>
      </div>
    </section>
  );
};

const QuestionList = ({ onMove }: { onMove: (screen: Screen) => void }) => (
  <section className="panel wide">
    <div className="panel-header">
      <div>
        <p className="eyebrow">SCR-10</p>
        <h2>質問一覧</h2>
        <p>状態、カテゴリ、プロジェクトで絞り込む想定です。</p>
      </div>
      <button className="primary-button" onClick={() => onMove("questionForm")} type="button">
        質問を追加
      </button>
    </div>
    <div className="filter-bar">
      <input placeholder="キーワード検索" />
      <select defaultValue="">
        <option value="">すべての状態</option>
        <option value="open">未解決</option>
        <option value="investigating">調査中</option>
        <option value="resolved">解決済み</option>
      </select>
      <select defaultValue="">
        <option value="">すべてのカテゴリ</option>
        <option>Java文法</option>
        <option>オブジェクト指向</option>
        <option>EVM</option>
      </select>
    </div>
    <div className="question-grid">
      {questions.map((question) => {
        const task = tasks.find((item) => item.id === question.taskId);
        const answerCount = aiAnswers.filter((answer) => answer.questionId === question.id).length;
        return (
          <article className="question-card" key={question.id}>
            <div className="question-card-header">
              <QuestionStatusPill status={question.status} />
              <span>{question.category}</span>
            </div>
            <h3>{question.title}</h3>
            <p>{question.content}</p>
            <div className="question-meta">
              <span>{task ? `関連: ${task.name}` : "プロジェクト全体"}</span>
              <span>AI回答 {answerCount}件</span>
            </div>
            <button className="secondary-button" onClick={() => onMove("questionForm")} type="button">
              詳細・編集
            </button>
          </article>
        );
      })}
    </div>
  </section>
);

const QuestionForm = ({ onMove }: { onMove: (screen: Screen) => void }) => {
  const question = questions[0];
  const relatedAnswers = aiAnswers.filter((answer) => answer.questionId === question.id);

  return (
    <section className="screen-grid">
      <div className="panel form-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">SCR-11</p>
            <h2>質問登録・編集</h2>
            <p>質問、回答メモ、AI回答履歴の配置を確認します。</p>
          </div>
        </div>
        <label>
          タイトル
          <input defaultValue={question.title} maxLength={100} />
        </label>
        <div className="form-row">
          <label>
            関連プロジェクト
            <select defaultValue={question.projectId}>
              {projects.filter((project) => !project.archived).map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </label>
          <label>
            関連タスク
            <select defaultValue={question.taskId ?? ""}>
              <option value="">プロジェクト全体</option>
              {getLeafTasks("java-silver", tasks).map((task) => (
                <option key={task.id} value={task.id}>{task.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            カテゴリ
            <input defaultValue={question.category} maxLength={100} />
          </label>
          <label>
            状態
            <select defaultValue={question.status}>
              <option value="open">未解決</option>
              <option value="investigating">調査中</option>
              <option value="resolved">解決済み</option>
            </select>
          </label>
        </div>
        <label>
          質問内容
          <textarea defaultValue={question.content} maxLength={5000} />
        </label>
        <label>
          回答メモ
          <textarea
            placeholder="解決済みにする場合は回答メモが必須です。"
            defaultValue={question.answerMemo}
            maxLength={5000}
          />
        </label>
        <div className="button-group">
          <button className="primary-button" type="button">保存する</button>
          <button className="secondary-button" onClick={() => onMove("aiContext")} type="button">
            AI回答を生成
          </button>
        </div>
      </div>
      <aside className="panel">
        <h2>AI回答履歴</h2>
        <p className="helper-text">AI回答は参考情報で、解決済みにするには回答メモが必要です。</p>
        <div className="log-list">
          {relatedAnswers.map((answer) => (
            <article className="log-item" key={answer.id}>
              <strong>{new Date(answer.generatedAt).toLocaleString("ja-JP")}</strong>
              <span>生成成功</span>
              <p>{answer.content}</p>
            </article>
          ))}
        </div>
        <div className="constraint-box">
          <strong>失敗時の表示</strong>
          <p>生成に失敗しても、質問、回答メモ、既存AI回答は失われません。</p>
        </div>
      </aside>
    </section>
  );
};

const AiContextSelector = ({ onMove }: { onMove: (screen: Screen) => void }) => (
  <section className="screen-grid">
    <div className="panel form-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">SCR-12</p>
          <h2>AI送信情報選択</h2>
          <p>外部AIサービスへ送信する情報をユーザーが選択します。</p>
        </div>
      </div>
      <div className="consent-card">
        <strong>外部送信への同意</strong>
        <p>
          AI回答生成では、質問情報、関連タスク、選択した学習記録・回答メモを
          外部AIサービスへ送信します。認証情報は送信しません。
        </p>
        <label className="checkbox-label">
          <input type="checkbox" defaultChecked />
          初回利用時の同意済み
        </label>
      </div>
      <section>
        <h3>送信する質問</h3>
        <div className="selected-context">
          <strong>{questions[0].title}</strong>
          <p>{questions[0].content}</p>
        </div>
      </section>
      <section>
        <h3>追加する学習記録・回答メモ（10件まで）</h3>
        <div className="context-list">
          {studyLogs.map((log) => {
            const task = tasks.find((item) => item.id === log.taskId);
            return (
              <label className="context-item" key={log.id}>
                <input type="checkbox" defaultChecked={log.id === "log-3"} />
                <span>
                  <strong>{formatDate(log.studyDate)} / {task?.name}</strong>
                  <small>{log.memo}</small>
                </span>
              </label>
            );
          })}
          <label className="context-item">
            <input type="checkbox" />
            <span>
              <strong>回答メモ: コンストラクタの暗黙定義</strong>
              <small>{questions[1].answerMemo}</small>
            </span>
          </label>
        </div>
      </section>
      <div className="button-group">
        <button className="primary-button" onClick={() => onMove("questionForm")} type="button">
          この内容でAI回答を生成
        </button>
        <button className="secondary-button" onClick={() => onMove("questionForm")} type="button">
          戻る
        </button>
      </div>
    </div>
    <aside className="panel">
      <h2>送信プレビュー</h2>
      <div className="send-preview">
        <span>質問情報</span>
        <span>関連タスク情報</span>
        <span>選択済み学習記録 1件</span>
      </div>
      <div className="constraint-box">
        <strong>確認したい論点</strong>
        <p>
          初回同意だけで十分か、生成ごとに送信内容プレビューを必須にするかを
          この画面で再検討します。
        </p>
      </div>
    </aside>
  </section>
);

const AiPlanInput = ({ onMove }: { onMove: (screen: Screen) => void }) => (
  <section className="screen-grid">
    <div className="hero-card ai-hero">
      <div>
        <p className="eyebrow">AI計画作成</p>
        <h2>教材情報からWBSと学習計画を作る</h2>
        <p>
          スクリーンショット、PDF、手書きメモ、貼り付け文章を入力し、
          ユーザーが内容を確認・修正してからAI生成へ進みます。
        </p>
      </div>
      <button className="primary-button light-button" onClick={() => onMove("aiPlanResult")} type="button">
        AIに依頼する
      </button>
    </div>

    <div className="panel form-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">SCR-13</p>
          <h2>教材入力</h2>
          <p>ChatGPTやGeminiのような入力欄で、教材情報と添付ファイルをまとめて送信します。</p>
        </div>
      </div>
      <label>
        教材名
        <input defaultValue="徹底攻略 Java SE 17 Silver 問題集" maxLength={100} />
      </label>
      <div className="composer-shell">
        <div className="attachment-chip-row">
          <span className="attachment-chip">目次画像 2/10枚</span>
          <span className="attachment-chip">PDF 1件</span>
          <span className="attachment-chip">合計 18MB / 50MB</span>
          <span className="attachment-chip">OCR結果は入力欄で修正</span>
        </div>
        <textarea
          aria-label="教材目次とAIへの指示"
          className="composer-textarea"
          defaultValue={`この教材情報から、Java Silver合格に向けたWBSと学習計画を作ってください。\nスクリーンショット・PDF・手書きメモのOCR結果は、ここで修正してから送信します。\n\n${tocSampleText}`}
        />
        <div className="composer-footer">
          <div className="composer-left">
            <button className="icon-button active" aria-label="添付メニューを開く" type="button">＋</button>
            <div className="attachment-menu">
              <button type="button">スクリーンショットをアップロードする</button>
              <button type="button">PDFをアップロードする</button>
              <button type="button">手書き文章・OCR結果を貼り付ける</button>
            </div>
          </div>
          <div className="composer-actions">
            <button className="stop-button" aria-label="実行を停止" type="button">■</button>
            <button className="run-button" onClick={() => onMove("aiPlanResult")} aria-label="実行" type="button">↑</button>
          </div>
        </div>
      </div>
      <div className="button-group">
        <button className="secondary-button" onClick={() => onMove("projects")} type="button">
          プロジェクト一覧へ戻る
        </button>
      </div>
    </div>

    <aside className="panel">
      <h2>確認ポイント</h2>
      <ul className="check-list">
        <li>テキスト入力、写真、画像ファイル添付を1つの入力欄にまとめても迷わないか</li>
        <li>+ メニューの項目が、写真・ファイル・貼り付け入力の導線として自然か</li>
        <li>実行ボタンと停止ボタンの配置が分かりやすいか</li>
        <li>外部送信への同意をAI回答と共通化するか、計画生成でも個別に確認するか</li>
      </ul>
      <div className="consent-card">
        <strong>送信される情報</strong>
        <p>
          教材名、ユーザーが修正したOCR結果、学習目標、期限、学習可能時間を
          AI計画生成に利用します。
        </p>
      </div>
    </aside>
  </section>
);

const AiPlanSettings = ({ onMove }: { onMove: (screen: Screen) => void }) => (
  <section className="screen-grid">
    <div className="panel wide">
      <div className="stepper">
        <span className="step-item done">1 教材入力</span>
        <span className="step-item done">2 結果確認</span>
        <span className="step-item active">3 チャットで調整</span>
      </div>
    </div>

    <div className="panel form-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">SCR-14</p>
          <h2>AI計画チャット</h2>
          <p>生成後も自然文でスケジュールやWBSの修正を依頼します。</p>
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
          修正案を反映
        </button>
        <button className="secondary-button" onClick={() => onMove("aiPlanResult")} type="button">
          反映せず戻る
        </button>
      </div>
    </div>

    <aside className="panel">
      <h2>確認ポイント</h2>
      <ul className="check-list">
        <li>フォーム入力より自然文依頼の方が使いやすいか</li>
        <li>保存済み計画にも同じチャット修正を使えるか</li>
        <li>AI修正案を直接反映せず、差分確認後に承認できるか</li>
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
  const leafTasks = aiPlanTasks.filter((task) => task.plannedHours > 0);
  const totalHours = leafTasks.reduce((sum, task) => sum + task.plannedHours, 0);

  return (
    <section className="screen-grid">
      <div className="hero-card">
        <div>
          <p className="eyebrow">SCR-15</p>
          <h2>AI生成結果確認</h2>
          <p>
            AIが作ったWBSと予定日を保存前に確認します。ここで修正できる範囲が、
            要件として重要になります。
          </p>
        </div>
        <div className="button-group">
          <button className="primary-button" onClick={() => onMove("projectDetail")} type="button">
            この計画で作成
          </button>
          <button className="secondary-button" onClick={() => onMove("aiPlanSettings")} type="button">
            チャットで修正
          </button>
        </div>
      </div>

      <div className="metric-row">
        <Metric label="生成タスク" value={`${aiPlanTasks.length}件`} />
        <Metric label="リーフタスク" value={`${leafTasks.length}件`} />
        <Metric label="予定工数" value={formatHours(totalHours)} />
      </div>

      <section className="panel wide">
        <div className="panel-header">
          <div>
            <h2>生成されたWBS案</h2>
            <p>保存前に名称、予定日、予定工数を調整できる想定です。</p>
          </div>
          <span className="badge warning">期限内に収まる計画案</span>
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
              <span>{formatDate(task.plannedStartDate)} - {formatDate(task.plannedEndDate)}</span>
              <span>{task.plannedHours === 0 ? "自動集計" : formatHours(task.plannedHours)}</span>
              <button className="text-button" type="button">編集</button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>AI計画チャット</h2>
        <div className="ai-note-list">
          <div className="ai-note-card">
            <strong>例: 追加依頼</strong>
            <p>6月20日は勉強できなくなった。期限は変えずにスケジュールを修正して。</p>
          </div>
          <div className="ai-note-card">
            <strong>反映方法</strong>
            <p>AIが変更差分を提示し、ユーザーが承認した場合だけWBSと予定へ反映します。</p>
          </div>
        </div>
        <button className="secondary-button full-width-button" onClick={() => onMove("aiPlanSettings")} type="button">
          チャットで計画を調整
        </button>
      </section>

      <section className="panel">
        <h2>保存前チェック</h2>
        <ul className="check-list">
          <li>プロジェクト名、期間、WBS名を保存前に編集できるか</li>
          <li>AI生成結果を破棄して再生成できるか</li>
          <li>生成後に質問管理やAI回答へ自然につながるか</li>
        </ul>
        <div className="constraint-box">
          <strong>未確定要件</strong>
          <p>
            生成結果の履歴を残すか、保存されたプロジェクトとWBSだけを残すかは
            要件定義で決める必要があります。
          </p>
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
      return (
        <article className={summary.isLeaf ? "task-row leaf" : "task-row parent"} key={task.id}>
          <div className="task-title" style={{ paddingLeft: `${level * 22}px` }}>
            <span className="task-icon">{summary.isLeaf ? "□" : "▾"}</span>
            <div>
              <strong>{task.name}</strong>
              {!compact && <small>{summary.isLeaf ? "リーフタスク" : "親タスク（自動集計）"}</small>}
            </div>
          </div>
          <span>{formatDate(summary.plannedStartDate)} - {formatDate(summary.plannedEndDate)}</span>
          {!compact && <span>{formatHours(summary.actualHours)} / {formatHours(summary.plannedHours)}</span>}
          <span><ProgressBar value={summary.progress} /></span>
          {!compact && <StatusPill status={summary.status} />}
          <span className="badge-list">
            {summary.isDelayed && <span className="badge danger">遅延</span>}
            {summary.isOutOfProjectRange && <span className="badge warning">期間外</span>}
            {editable && task.hasLogs && <span className="badge neutral">親化不可</span>}
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
}: {
  label: string;
  value: string;
  tone?: "normal" | "warning" | "danger";
  help?: string[];
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

const getQuestionStatusLabel = (status: QuestionStatus) => {
  switch (status) {
    case "open":
      return "未解決";
    case "investigating":
      return "調査中";
    case "resolved":
      return "解決済み";
  }
};

const QuestionStatusPill = ({ status }: { status: QuestionStatus }) => (
  <span className={`status-pill question-${status}`}>{getQuestionStatusLabel(status)}</span>
);

const ProgressBar = ({ value }: { value: number }) => (
  <div className="progress-wrap" aria-label={`進捗率 ${formatProgress(value)}`}>
    <div className="progress-track">
      <span className="progress-fill" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
    <span>{formatProgress(value)}</span>
  </div>
);
