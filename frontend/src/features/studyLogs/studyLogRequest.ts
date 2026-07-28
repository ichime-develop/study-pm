// 学習記録フォームの入力検証とAPIリクエスト生成を共有する。
import { currentJstDate } from "../../shared/time/jstDate";
import type { StudyLog, StudyLogCreateRequest } from "./studyLogTypes";

export type StudyLogFormValues = {
  memo: string;
  studyDate: string;
  studyHours: string;
  wbsTaskId: string;
};

type StudyLogRequestResult =
  | { request: StudyLogCreateRequest }
  | { validationMessage: string };

export const newStudyLogFormValues = (wbsTaskId = ""): StudyLogFormValues => ({
  memo: "",
  studyDate: currentJstDate(),
  studyHours: "",
  wbsTaskId,
});

export const studyLogFormValuesFor = (studyLog: StudyLog): StudyLogFormValues => ({
  memo: studyLog.memo ?? "",
  studyDate: studyLog.studyDate,
  studyHours: String(studyLog.studyHours),
  wbsTaskId: studyLog.wbsTaskId,
});

export const buildStudyLogRequest = (values: StudyLogFormValues): StudyLogRequestResult => {
  if (values.wbsTaskId.length === 0) {
    return { validationMessage: "対象タスクを選択してください。" };
  }
  if (values.studyDate.length === 0) {
    return { validationMessage: "学習日を入力してください。" };
  }
  if (values.studyDate > currentJstDate()) {
    return { validationMessage: "未来日の学習記録は登録できません。" };
  }

  const studyHours = Number(values.studyHours);
  if (!isValidStudyHours(studyHours)) {
    return { validationMessage: "学習時間は0.25時間以上9999.99時間以下の0.25時間刻みで入力してください。" };
  }

  return {
    request: {
      wbsTaskId: values.wbsTaskId,
      studyDate: values.studyDate,
      studyHours,
      memo: emptyToNull(values.memo),
    },
  };
};

const emptyToNull = (value: string): string | null => {
  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? null : trimmedValue;
};

const isValidStudyHours = (hours: number): boolean =>
  Number.isFinite(hours) &&
  hours >= 0.25 &&
  hours <= 9999.99 &&
  Math.abs(hours * 4 - Math.round(hours * 4)) < 1e-9;
