export type ProjectStatus = "not_started" | "in_progress" | "completed";
export type TaskStatus = "not_started" | "in_progress" | "completed";

export type Project = {
  id: string;
  name: string;
  summary: string;
  field: string;
  startDate: string;
  targetEndDate: string;
  status: ProjectStatus;
  archived: boolean;
  updatedAt: string;
};

export type WbsTask = {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  description: string;
  plannedStartDate: string;
  plannedEndDate: string;
  plannedHours: number;
  progress: number;
  hasLogs: boolean;
};

export type StudyLog = {
  id: string;
  projectId: string;
  taskId: string;
  studyDate: string;
  hours: number;
  memo: string;
  updatedAt: string;
};

export type QuestionStatus = "open" | "investigating" | "resolved";

export type Question = {
  id: string;
  projectId: string;
  taskId: string | null;
  title: string;
  content: string;
  category: string;
  status: QuestionStatus;
  answerMemo: string;
  updatedAt: string;
};

export type AiAnswer = {
  id: string;
  questionId: string;
  source: "ai";
  generatedAt: string;
  content: string;
  status: "success" | "failed";
};

export type AiPlanTask = {
  id: string;
  level: number;
  name: string;
  description: string;
  plannedStartDate: string;
  plannedEndDate: string;
  plannedHours: number;
};

export const today = "2026-06-05";

export const projects: Project[] = [
  {
    id: "java-silver",
    name: "Java Silver 合格",
    summary: "Javaの基礎文法、クラス設計、例外、コレクションを一通り確認する。",
    field: "Java",
    startDate: "2026-06-01",
    targetEndDate: "2026-07-15",
    status: "in_progress",
    archived: false,
    updatedAt: "2026-06-05T09:00:00+09:00",
  },
  {
    id: "sql-basic",
    name: "SQL基礎習得",
    summary: "SELECT、JOIN、集計、インデックスの基礎を学ぶ。",
    field: "SQL",
    startDate: "2026-06-10",
    targetEndDate: "2026-07-05",
    status: "not_started",
    archived: false,
    updatedAt: "2026-06-04T20:00:00+09:00",
  },
  {
    id: "pm-basic",
    name: "PMBOK概要理解",
    summary: "プロジェクト管理の基本用語とEVMの考え方を整理する。",
    field: "プロジェクト管理",
    startDate: "2026-05-01",
    targetEndDate: "2026-05-31",
    status: "completed",
    archived: false,
    updatedAt: "2026-06-01T18:30:00+09:00",
  },
  {
    id: "archived-design",
    name: "設計書入門 読破",
    summary: "アーカイブ表示確認用のプロジェクト。",
    field: "設計",
    startDate: "2026-04-01",
    targetEndDate: "2026-04-30",
    status: "completed",
    archived: true,
    updatedAt: "2026-05-01T12:00:00+09:00",
  },
];

export const tasks: WbsTask[] = [
  {
    id: "java-ch1",
    projectId: "java-silver",
    parentId: null,
    name: "第1章 Javaの基本",
    description: "文法、型、演算子を整理する親タスク。",
    plannedStartDate: "2026-06-01",
    plannedEndDate: "2026-06-07",
    plannedHours: 0,
    progress: 0,
    hasLogs: false,
  },
  {
    id: "java-ch1-read",
    projectId: "java-silver",
    parentId: "java-ch1",
    name: "第1章を読む",
    description: "基本文法と型変換を確認する。",
    plannedStartDate: "2026-06-01",
    plannedEndDate: "2026-06-03",
    plannedHours: 4,
    progress: 100,
    hasLogs: true,
  },
  {
    id: "java-ch1-ex",
    projectId: "java-silver",
    parentId: "java-ch1",
    name: "章末問題を解く",
    description: "間違えた問題をメモする。",
    plannedStartDate: "2026-06-04",
    plannedEndDate: "2026-06-05",
    plannedHours: 3,
    progress: 60,
    hasLogs: true,
  },
  {
    id: "java-ch2",
    projectId: "java-silver",
    parentId: null,
    name: "第2章 クラスとオブジェクト",
    description: "クラス、コンストラクタ、継承の親タスク。",
    plannedStartDate: "2026-06-06",
    plannedEndDate: "2026-06-14",
    plannedHours: 0,
    progress: 0,
    hasLogs: false,
  },
  {
    id: "java-ch2-class",
    projectId: "java-silver",
    parentId: "java-ch2",
    name: "クラス定義を読む",
    description: "フィールド、メソッド、コンストラクタを理解する。",
    plannedStartDate: "2026-06-06",
    plannedEndDate: "2026-06-08",
    plannedHours: 5,
    progress: 20,
    hasLogs: false,
  },
  {
    id: "java-ch2-inheritance",
    projectId: "java-silver",
    parentId: "java-ch2",
    name: "継承の問題を解く",
    description: "オーバーライド、super、アクセス修飾子を確認する。",
    plannedStartDate: "2026-06-09",
    plannedEndDate: "2026-06-12",
    plannedHours: 6,
    progress: 0,
    hasLogs: false,
  },
  {
    id: "java-mock",
    projectId: "java-silver",
    parentId: null,
    name: "模擬試験",
    description: "本番形式の問題を解く。",
    plannedStartDate: "2026-07-16",
    plannedEndDate: "2026-07-16",
    plannedHours: 2,
    progress: 0,
    hasLogs: false,
  },
  {
    id: "sql-select",
    projectId: "sql-basic",
    parentId: null,
    name: "SELECT基礎",
    description: "SELECT、WHERE、ORDER BYを確認する。",
    plannedStartDate: "2026-06-10",
    plannedEndDate: "2026-06-12",
    plannedHours: 4,
    progress: 0,
    hasLogs: false,
  },
];

export const studyLogs: StudyLog[] = [
  {
    id: "log-1",
    projectId: "java-silver",
    taskId: "java-ch1-read",
    studyDate: "2026-06-02",
    hours: 1.5,
    memo: "型変換とcharの扱いを復習した。",
    updatedAt: "2026-06-02T22:00:00+09:00",
  },
  {
    id: "log-2",
    projectId: "java-silver",
    taskId: "java-ch1-read",
    studyDate: "2026-06-03",
    hours: 2.5,
    memo: "章末前まで読了。演算子の優先順位をメモ。",
    updatedAt: "2026-06-03T21:30:00+09:00",
  },
  {
    id: "log-3",
    projectId: "java-silver",
    taskId: "java-ch1-ex",
    studyDate: "2026-06-05",
    hours: 1.25,
    memo: "章末問題を半分解いた。switch式を再確認する。",
    updatedAt: "2026-06-05T08:45:00+09:00",
  },
];

export const questions: Question[] = [
  {
    id: "q-1",
    projectId: "java-silver",
    taskId: "java-ch1-ex",
    title: "switch式とswitch文の違いを整理したい",
    content: "Java Silverの問題でswitch式の戻り値とbreakの扱いが混ざってしまう。",
    category: "Java文法",
    status: "open",
    answerMemo: "",
    updatedAt: "2026-06-05T09:15:00+09:00",
  },
  {
    id: "q-2",
    projectId: "java-silver",
    taskId: "java-ch2-class",
    title: "コンストラクタの暗黙定義が分からない",
    content: "引数ありコンストラクタを定義した場合、デフォルトコンストラクタがどうなるか確認したい。",
    category: "オブジェクト指向",
    status: "investigating",
    answerMemo: "引数ありコンストラクタを定義すると、引数なしコンストラクタは自動生成されない。",
    updatedAt: "2026-06-04T20:20:00+09:00",
  },
  {
    id: "q-3",
    projectId: "pm-basic",
    taskId: null,
    title: "SPIとCPIの読み方",
    content: "SPIとCPIが1を超える場合、学習プロジェクトではどう解釈するか。",
    category: "EVM",
    status: "resolved",
    answerMemo: "SPIは予定に対する進み具合、CPIは実績工数に対する効率として見る。",
    updatedAt: "2026-06-01T12:00:00+09:00",
  },
];

export const aiAnswers: AiAnswer[] = [
  {
    id: "ai-1",
    questionId: "q-1",
    source: "ai",
    generatedAt: "2026-06-05T09:20:00+09:00",
    content:
      "switch式は値を返す式として扱えます。caseごとにyieldまたはアロー構文で値を返し、従来のswitch文よりフォールスルーを避けやすい点が特徴です。",
    status: "success",
  },
  {
    id: "ai-2",
    questionId: "q-2",
    source: "ai",
    generatedAt: "2026-06-04T20:10:00+09:00",
    content:
      "コンストラクタを1つも定義しない場合だけ、コンパイラが引数なしコンストラクタを追加します。1つでも定義すると自動追加されません。",
    status: "success",
  },
];

export const tocSampleText = `第1章 Javaの基本
  1-1 Javaプログラムの構造
  1-2 データ型と変数
  1-3 演算子と型変換
第2章 クラスとオブジェクト
  2-1 クラス定義
  2-2 コンストラクタ
  2-3 継承とポリモーフィズム
第3章 例外処理とAPI
  3-1 例外処理
  3-2 コレクション
  3-3 模擬問題`;

export const aiPlanTasks: AiPlanTask[] = [
  {
    id: "plan-1",
    level: 0,
    name: "第1章 Javaの基本",
    description: "文法、型、演算子を理解する親タスク。",
    plannedStartDate: "2026-06-08",
    plannedEndDate: "2026-06-15",
    plannedHours: 0,
  },
  {
    id: "plan-1-1",
    level: 1,
    name: "Javaプログラムの構造を読む",
    description: "mainメソッド、パッケージ、importを確認する。",
    plannedStartDate: "2026-06-08",
    plannedEndDate: "2026-06-09",
    plannedHours: 2,
  },
  {
    id: "plan-1-2",
    level: 1,
    name: "データ型と変数を整理する",
    description: "プリミティブ型、参照型、varの扱いを整理する。",
    plannedStartDate: "2026-06-10",
    plannedEndDate: "2026-06-12",
    plannedHours: 3,
  },
  {
    id: "plan-1-3",
    level: 1,
    name: "演算子と型変換の問題を解く",
    description: "暗黙変換、キャスト、演算子優先順位を問題で確認する。",
    plannedStartDate: "2026-06-13",
    plannedEndDate: "2026-06-15",
    plannedHours: 3,
  },
  {
    id: "plan-2",
    level: 0,
    name: "第2章 クラスとオブジェクト",
    description: "クラス定義、コンストラクタ、継承を理解する親タスク。",
    plannedStartDate: "2026-06-16",
    plannedEndDate: "2026-06-27",
    plannedHours: 0,
  },
  {
    id: "plan-2-1",
    level: 1,
    name: "クラス定義とコンストラクタを読む",
    description: "フィールド、メソッド、初期化順序を確認する。",
    plannedStartDate: "2026-06-16",
    plannedEndDate: "2026-06-20",
    plannedHours: 5,
  },
  {
    id: "plan-2-2",
    level: 1,
    name: "継承とポリモーフィズムを演習する",
    description: "override、super、アクセス修飾子の問題を解く。",
    plannedStartDate: "2026-06-21",
    plannedEndDate: "2026-06-27",
    plannedHours: 6,
  },
  {
    id: "plan-3",
    level: 0,
    name: "第3章 例外処理とAPI",
    description: "例外、コレクション、模擬問題を扱う親タスク。",
    plannedStartDate: "2026-06-28",
    plannedEndDate: "2026-07-12",
    plannedHours: 0,
  },
  {
    id: "plan-3-1",
    level: 1,
    name: "例外処理とコレクションを学習する",
    description: "try-catch、throws、List/Set/Mapの基本を確認する。",
    plannedStartDate: "2026-06-28",
    plannedEndDate: "2026-07-05",
    plannedHours: 7,
  },
  {
    id: "plan-3-2",
    level: 1,
    name: "模擬問題と弱点復習",
    description: "模擬問題を解き、質問管理に不明点を登録する。",
    plannedStartDate: "2026-07-06",
    plannedEndDate: "2026-07-12",
    plannedHours: 6,
  },
];
