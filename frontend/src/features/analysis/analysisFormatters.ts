// 進捗分析に固有の算出不可理由と数値を画面表示用の文言に変換する。
import type { AnalysisUnavailableReason } from "./analysisTypes";

export const analysisUnavailableMessage = (reason: AnalysisUnavailableReason): string => {
  switch (reason) {
    case "NO_LEAF_TASKS":
      return "計算対象となるLEAFタスクがありません。";
    case "MISSING_SCHEDULE":
      return "予定開始日または予定終了日が未設定のタスクがあります。";
    case "ZERO_PLANNED_HOURS":
      return "予定工数の合計が0時間です。";
    case "ZERO_PLANNED_VALUE":
      return "基準日までの計画値が0時間のため、SPIを計算できません。";
    case "ZERO_ACTUAL_HOURS":
      return "基準日までの実績工数が0時間のため、CPIを計算できません。";
  }
};

export const formatAnalysisNumber = (value: number | null, maximumFractionDigits = 2): string => {
  if (value === null) {
    return "-";
  }
  return new Intl.NumberFormat("ja-JP", { maximumFractionDigits }).format(value);
};

export const formatSignedHours = (value: number | null): string => {
  if (value === null) {
    return "-";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatAnalysisNumber(value)}h`;
};

export const formatAnalysisHours = (value: number | null): string =>
  value === null ? "-" : `${formatAnalysisNumber(value)}h`;
