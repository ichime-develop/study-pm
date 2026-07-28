// API-SL-02で登録する学習記録と登録後の再計算サマリーを表す。
export type StudyLogCreateRequest = {
  memo: string | null;
  studyDate: string;
  studyHours: number;
  wbsTaskId: string;
};

export type StudyLog = {
  createdAt: string;
  memo: string | null;
  projectId: string;
  studyDate: string;
  studyHours: number;
  studyLogId: string;
  updatedAt: string;
  wbsTaskId: string;
  wbsTaskName: string;
};

export type StudyLogRecalculation = {
  previousWbsTaskActualHours: number | null;
  previousWbsTaskId: string | null;
  projectActualHours: number;
  projectId: string;
  wbsTaskActualHours: number;
  wbsTaskId: string;
};

export type StudyLogMutationResponse = {
  studyLog: StudyLog;
  summary: StudyLogRecalculation;
};
