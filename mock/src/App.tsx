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
  | "projectForm"
  | "wbs"
  | "studyLogs"
  | "studyLog"
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
  projectForm: "プロジェクト作成・編集",
  wbs: "WBS編集",
  studyLogs: "学習記録一覧",
  studyLog: "学習記録登録",
  questions: "質問一覧",
  questionForm: "質問登録・編集",
  aiContext: "AI送信情報選択",
  aiPlanInput: "教材入力",
  aiPlanSettings: "AI生成条件",
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
        {screen === "projectForm" && <ProjectForm project={selectedProject} onMove={setScreen} />}
        {screen === "wbs" && <WbsEditor project={selectedProject} />}
        {screen === "studyLogs" && <StudyLogList />}
        {screen === "studyLog" && <StudyLogForm project={selectedProject} />}
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
          <button className="primary-button" onClick={() => onOpenProject("java-silver", "studyLog")} type="button">
            学習記録を追加
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
}) => (
  <section className="panel wide">
    <div className="panel-header">
      <div>
        <h2>プロジェクト一覧</h2>
        <p>初期表示はアーカイブを除外し、更新日時の降順です。</p>
      </div>
      <div className="button-group">
        <button className="secondary-button" onClick={() => onMove("projectForm")} type="button">
          手動で作成
        </button>
        <button className="primary-button" onClick={() => onMove("aiPlanInput")} type="button">
          目次からAIで作成
        </button>
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

const ProjectDetail = ({ project, onMove }: { project: Project; onMove: (screen: Screen) => void }) => {
  const summary = buildProjectSummary(project, tasks, studyLogs);
  const projectTasks = tasks.filter((task) => task.projectId === project.id);

  return (
    <section className="screen-grid">
      <div className="hero-card">
        <div>
          <p className="eyebrow">{project.field}</p>
          <h2>{project.name}</h2>
          <p>{project.summary}</p>
        </div>
        <div className="button-group">
          <button className="secondary-button" onClick={() => onMove("wbs")} type="button">WBSを編集</button>
          <button className="secondary-button" onClick={() => onMove("projectForm")} type="button">プロジェクト編集</button>
          <button className="secondary-button" onClick={() => onMove("studyLogs")} type="button">学習記録一覧</button>
          <button className="secondary-button" onClick={() => onMove("questions")} type="button">質問一覧</button>
          <button className="primary-button" onClick={() => onMove("studyLog")} type="button">学習記録を追加</button>
        </div>
      </div>

      <div className="metric-row">
        <Metric label="進捗率" value={formatProgress(summary.progress)} />
        <Metric label="実績 / 予定" value={`${formatHours(summary.actualHours)} / ${formatHours(summary.plannedHours)}`} />
        <Metric label="期間外タスク" value={`${summary.outOfRangeCount}件`} tone={summary.outOfRangeCount > 0 ? "warning" : "normal"} />
      </div>

      <section className="panel wide">
        <div className="panel-header">
          <h2>EVM・バーンダウン</h2>
          <p>MVP 2で追加する進捗可視化の配置確認です。</p>
        </div>
        <EvmPanel project={project} />
      </section>

      <section className="panel wide">
        <div className="panel-header">
          <h2>WBSサマリー</h2>
          <p>親タスクは配下リーフタスクから自動集計されます。</p>
        </div>
        <TaskList tasks={projectTasks} project={project} />
      </section>
    </section>
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
        <Metric label="BAC" value={formatHours(summary.plannedHours)} />
        <Metric label="PV" value={formatHours(pv)} />
        <Metric label="EV" value={formatHours(ev)} />
        <Metric label="AC" value={formatHours(ac)} />
        <Metric label="SV" value={formatHours(sv)} tone={sv < 0 ? "danger" : "normal"} />
        <Metric label="CV" value={formatHours(cv)} tone={cv < 0 ? "warning" : "normal"} />
        <Metric label="SPI" value={spi ? spi.toFixed(2) : "算出不可"} />
        <Metric label="CPI" value={cpi ? cpi.toFixed(2) : "算出不可"} />
      </div>
      <div className="chart-card">
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

const StudyLogForm = ({ project }: { project: Project }) => {
  const leafTasks = getLeafTasks(project.id, tasks);
  const completedTask = leafTasks.find((task) => task.progress === 100);

  return (
    <section className="screen-grid">
      <div className="panel form-panel">
        <div className="panel-header">
          <div>
            <h2>学習記録登録</h2>
            <p>リーフタスクだけを選択できます。未来日は登録できません。</p>
          </div>
        </div>
        <label>
          プロジェクト
          <input value={project.name} readOnly />
        </label>
        <label>
          対象リーフタスク
          <select defaultValue="java-ch1-ex">
            {leafTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.name}{task.progress === 100 ? "（完了済み）" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label>
            学習日
            <input type="date" defaultValue={today} max={today} />
          </label>
          <label>
            学習時間
            <input type="number" min="0.25" step="0.25" defaultValue="1.25" />
          </label>
        </div>
        <label>
          メモ
          <textarea defaultValue="章末問題を解いた。switch式の条件分岐を再確認する。" />
        </label>
        <button className="primary-button" type="button">登録する</button>
      </div>

      <aside className="panel">
        <h2>確認ポイント</h2>
        <ul className="check-list">
          <li>0.25時間単位の入力が分かるか</li>
          <li>完了済みタスクにも記録できることが伝わるか</li>
          <li>少ない操作で登録できるか</li>
        </ul>
        {completedTask && (
          <div className="constraint-box">
            <strong>完了済みタスク例</strong>
            <p>{completedTask.name} にも追加学習の記録を登録できます。</p>
          </div>
        )}
      </aside>
    </section>
  );
};

const StudyLogList = () => (
  <section className="panel wide">
    <div className="panel-header">
      <div>
        <p className="eyebrow">SCR-08</p>
        <h2>学習記録一覧</h2>
        <p>日付範囲、プロジェクト、WBSタスクでの絞り込み確認画面です。</p>
      </div>
      <button className="primary-button" type="button">学習記録を追加</button>
    </div>
    <div className="filter-bar">
      <input type="date" defaultValue="2026-06-01" />
      <input type="date" defaultValue={today} />
      <select defaultValue="java-silver">
        {projects.filter((project) => !project.archived).map((project) => (
          <option key={project.id} value={project.id}>{project.name}</option>
        ))}
      </select>
      <select defaultValue="">
        <option value="">すべてのリーフタスク</option>
        {getLeafTasks("java-silver", tasks).map((task) => (
          <option key={task.id} value={task.id}>{task.name}</option>
        ))}
      </select>
    </div>
    <div className="table">
      <div className="table-row log-table-head">
        <span>学習日</span>
        <span>プロジェクト</span>
        <span>タスク</span>
        <span>時間</span>
        <span>メモ</span>
      </div>
      {[...studyLogs]
        .sort((a, b) =>
          b.studyDate === a.studyDate
            ? b.updatedAt.localeCompare(a.updatedAt)
            : b.studyDate.localeCompare(a.studyDate),
        )
        .map((log) => {
          const project = projects.find((item) => item.id === log.projectId);
          const task = tasks.find((item) => item.id === log.taskId);
          return (
            <article className="table-row log-table-row" key={log.id}>
              <span>{formatDate(log.studyDate)}</span>
              <span>{project?.name}</span>
              <span>{task?.name}</span>
              <span>{formatHours(log.hours)}</span>
              <span>{log.memo}</span>
            </article>
          );
        })}
    </div>
  </section>
);

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
        <h2>教材の目次からWBSと学習計画を作る</h2>
        <p>
          目次写真をOCRでテキスト化し、ユーザーが結果を修正してからAI生成へ進みます。
          貼り付け入力の場合も、同じ確認欄で内容を整えます。
        </p>
      </div>
      <button className="primary-button light-button" onClick={() => onMove("aiPlanSettings")} type="button">
        生成条件へ進む
      </button>
    </div>

    <div className="panel form-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">SCR-13</p>
          <h2>教材入力</h2>
          <p>教材名と目次を入力します。</p>
        </div>
      </div>
      <label>
        教材名
        <input defaultValue="徹底攻略 Java SE 17 Silver 問題集" maxLength={100} />
      </label>
      <div className="ocr-workflow">
        <section className="ocr-step-card">
          <div className="step-badge">1</div>
          <div className="ocr-step-body">
            <div className="ocr-step-header">
              <h3>目次を取り込む</h3>
              <span className="badge neutral">画像選択 / 貼り付け</span>
            </div>
            <div className="upload-zone compact-upload">
              <label className="capture-card primary-capture">
                <span>画像を選ぶ</span>
                <small>PCでは保存済みの目次写真を選択</small>
                <input aria-label="保存済みの目次画像を選択" type="file" accept="image/*" />
              </label>
              <div className="capture-card">
                <span>テキストを貼る</span>
                <small>コピーした目次を下の修正欄へ貼り付け</small>
              </div>
              <div className="paste-hint">テキスト貼り付けは下の読み取り結果欄へ</div>
            </div>
          </div>
        </section>

        <div className="workflow-arrow" aria-hidden="true">↓</div>

        <section className="ocr-step-card active-card">
          <div className="step-badge active">2</div>
          <div className="ocr-step-body">
            <div className="ocr-step-header">
              <h3>読み取り結果を直す</h3>
              <span className="badge warning">送信前チェック</span>
            </div>
            <textarea aria-label="OCR結果の確認・修正" className="toc-textarea" defaultValue={tocSampleText} />
          </div>
        </section>
      </div>
      <div className="button-group">
        <button className="primary-button" onClick={() => onMove("aiPlanSettings")} type="button">
          修正した目次で生成条件へ
        </button>
        <button className="secondary-button" onClick={() => onMove("projects")} type="button">
          プロジェクト一覧へ戻る
        </button>
      </div>
    </div>

    <aside className="panel">
      <h2>確認ポイント</h2>
      <ul className="check-list">
        <li>OCR結果を修正する欄が、AI送信前の確認ステップとして伝わるか</li>
        <li>画像入力なしでテキスト貼り付けだけでも同じ導線を使えるか</li>
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
        <span className="step-item active">2 生成条件</span>
        <span className="step-item">3 結果確認</span>
      </div>
    </div>

    <div className="panel form-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">SCR-14</p>
          <h2>AI生成条件</h2>
          <p>AIに任せる範囲と、ユーザーが指定すべき条件を確認します。</p>
        </div>
      </div>
      <label>
        学習目的
        <textarea defaultValue="Java Silverに合格するため、章ごとの理解と問題演習を計画的に進めたい。" />
      </label>
      <div className="form-row">
        <label>
          学習開始日
          <input type="date" defaultValue="2026-06-08" />
        </label>
        <label>
          目標終了日
          <input type="date" defaultValue="2026-07-12" />
        </label>
      </div>
      <div className="form-row">
        <label>
          週あたり学習可能時間
          <input type="number" min="0.25" step="0.25" defaultValue="8" />
        </label>
        <label>
          1日の上限時間
          <input type="number" min="0.25" step="0.25" defaultValue="2" />
        </label>
      </div>
      <div className="option-grid">
        <label className="checkbox-label option-card">
          <input type="checkbox" defaultChecked />
          <span>WBSを章単位で親タスク化する</span>
        </label>
        <label className="checkbox-label option-card">
          <input type="checkbox" defaultChecked />
          <span>問題演習と復習タスクを追加する</span>
        </label>
        <label className="checkbox-label option-card">
          <input type="checkbox" />
          <span>土日にも学習予定を入れる</span>
        </label>
        <label className="checkbox-label option-card">
          <input type="checkbox" defaultChecked />
          <span>期限に収まらない場合は警告する</span>
        </label>
      </div>
      <div className="button-group">
        <button className="primary-button" onClick={() => onMove("aiPlanResult")} type="button">
          AIで計画案を生成
        </button>
        <button className="secondary-button" onClick={() => onMove("aiPlanInput")} type="button">
          教材入力へ戻る
        </button>
      </div>
    </div>

    <aside className="panel">
      <h2>この画面で詰める要件</h2>
      <ul className="check-list">
        <li>学習可能時間を週単位で聞くか、曜日ごとに聞くか</li>
        <li>AIが作る予定工数をユーザーがどこまで調整できるようにするか</li>
        <li>WBS生成だけにするか、プロジェクト作成まで一括で行うか</li>
      </ul>
      <div className="constraint-box neutral-box">
        <strong>要件候補</strong>
        <p>
          AI生成結果は直接保存せず、ユーザーが確認してからプロジェクトとWBSを作成します。
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
            条件を修正
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
        <h2>AI生成メモ</h2>
        <div className="ai-note-list">
          <div className="ai-note-card">
            <strong>根拠</strong>
            <p>目次の章立てを親タスク、節と演習をリーフタスクとして分解しました。</p>
          </div>
          <div className="ai-note-card">
            <strong>調整案</strong>
            <p>第2章は範囲が広いため、演習時間を多めに配分しています。</p>
          </div>
        </div>
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
}: {
  label: string;
  value: string;
  tone?: "normal" | "warning" | "danger";
}) => (
  <div className={`metric-card ${tone}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
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
