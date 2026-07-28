// WBSタスクの完全更新リクエストを画面内の複数編集導線で共通化する。
import type { WbsTask, WbsTaskUpdateRequest } from "./wbsTypes";

type WbsTaskUpdateFields = {
  description: string;
  name: string;
  parentTaskId: string;
  plannedEndDate: string;
  plannedHours: string;
  plannedStartDate: string;
  task: WbsTask;
};

export type WbsTaskUpdateRequestResult =
  | { error: string; request?: never }
  | { error?: never; request: WbsTaskUpdateRequest };

export const buildWbsTaskUpdateRequest = ({
  description,
  name,
  parentTaskId,
  plannedEndDate,
  plannedHours,
  plannedStartDate,
  task,
}: WbsTaskUpdateFields): WbsTaskUpdateRequestResult => {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return { error: "名称を入力してください。" };
  }

  if (task.taskType === "PARENT") {
    return {
      request: {
        name: trimmedName,
        description: emptyToNull(description),
        parentTaskId: null,
        plannedStartDate: null,
        plannedEndDate: null,
        plannedHours: null,
      },
    };
  }

  const hours = Number(plannedHours);
  if (!isValidPlannedHours(hours)) {
    return { error: "予定工数は0.25時間以上9999.99時間以下の0.25時間刻みで入力してください。" };
  }
  if (plannedStartDate !== "" && plannedEndDate !== "" && plannedStartDate > plannedEndDate) {
    return { error: "予定開始日は予定終了日以前にしてください。" };
  }

  return {
    request: {
      name: trimmedName,
      description: emptyToNull(description),
      parentTaskId: emptyToNull(parentTaskId),
      plannedStartDate: emptyToNull(plannedStartDate),
      plannedEndDate: emptyToNull(plannedEndDate),
      plannedHours: hours,
    },
  };
};

export const updateFieldsForTask = (task: WbsTask) => ({
  task,
  name: task.name,
  description: task.description ?? "",
  parentTaskId: task.parentTaskId ?? "",
  plannedStartDate: task.plannedStartDate ?? "",
  plannedEndDate: task.plannedEndDate ?? "",
  plannedHours: task.plannedHours?.toString() ?? "",
});

const emptyToNull = (value: string): string | null => {
  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? null : trimmedValue;
};

const isValidPlannedHours = (hours: number): boolean =>
  Number.isFinite(hours) &&
  hours >= 0.25 &&
  hours <= 9999.99 &&
  Math.abs(hours * 4 - Math.round(hours * 4)) < 1e-9;
