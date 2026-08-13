// AI01〜AI03を戻って操作したときに、未確定の入力内容を同じタブ内で保持する。
import type { AiPlanMaterialMode, AiPlanMethod, AiWbsSplitUnit } from "./aiPlanTypes";

const STORAGE_KEY = "study-pm.ai-plan.input";

export type AiPlanInputSnapshot = {
  method: AiPlanMethod;
  learningGoal: string;
  projectName: string;
  startDate: string;
  targetEndDate: string;
  weekdayAvailableHours: string;
  weekendAvailableHours: string;
  unavailableWeekdays: string[];
  scheduleNotes: string;
  focusText: string;
  lightText: string;
  excludeText: string;
  quantityUnit: string;
  totalAmount: string;
  dailyAmount: string;
  wbsSplitUnit: AiWbsSplitUnit;
  overview: string;
  materialMode: AiPlanMaterialMode;
  materialName: string;
  tocText: string;
};

export const defaultAiPlanInput = (method: AiPlanMethod): AiPlanInputSnapshot => ({
  method,
  learningGoal: "",
  projectName: "",
  startDate: "",
  targetEndDate: "",
  weekdayAvailableHours: "1",
  weekendAvailableHours: "2",
  unavailableWeekdays: [],
  scheduleNotes: "",
  focusText: "",
  lightText: "",
  excludeText: "",
  quantityUnit: "ページ",
  totalAmount: "",
  dailyAmount: "",
  wbsSplitUnit: "SECTION",
  overview: "",
  materialMode: "image",
  materialName: "",
  tocText: "",
});

export const loadAiPlanInput = (method: AiPlanMethod): AiPlanInputSnapshot => {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      return defaultAiPlanInput(method);
    }
    const parsed = JSON.parse(stored) as Partial<AiPlanInputSnapshot>;
    return { ...defaultAiPlanInput(method), ...parsed, method };
  } catch {
    return defaultAiPlanInput(method);
  }
};

export const saveAiPlanInput = (input: AiPlanInputSnapshot): void => {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(input));
};

export const clearAiPlanInput = (): void => {
  window.sessionStorage.removeItem(STORAGE_KEY);
};
