// 進捗分析APIのEVM、バーンダウン、計画不整合レスポンス型を表す。
export type AnalysisUnavailableReason =
  | "NO_LEAF_TASKS"
  | "MISSING_SCHEDULE"
  | "ZERO_PLANNED_HOURS"
  | "ZERO_PLANNED_VALUE"
  | "ZERO_ACTUAL_HOURS";

export type EvmAnalysis = {
  baseDate: string;
  isCalculable: boolean;
  unavailableReasons: AnalysisUnavailableReason[];
  bac: number | null;
  pv: number | null;
  ev: number | null;
  ac: number | null;
  sv: number | null;
  cv: number | null;
  spi: number | null;
  cpi: number | null;
};

export type BurndownPoint = {
  date: string;
  remainingHours: number;
};

export type BurndownAnalysis = {
  baseDate: string;
  isCalculable: boolean;
  unavailableReasons: AnalysisUnavailableReason[];
  idealPoints: BurndownPoint[];
  actualPoints: BurndownPoint[];
  idealRemainingHours: number | null;
  actualRemainingHours: number | null;
  workDifferenceHours: number | null;
  dayDifference: number | null;
};

export type PlanWarningType = "STARTS_BEFORE_PROJECT" | "ENDS_AFTER_PROJECT";

export type PlanWarning = {
  taskId: string;
  taskName: string;
  type: PlanWarningType;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  message: string;
};

export type PlanWarnings = {
  warnings: PlanWarning[];
};
