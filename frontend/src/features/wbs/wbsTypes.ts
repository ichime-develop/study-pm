// CM02とWB01で共有するWBS一覧・作成APIのレスポンス型を表す。
export type WbsTaskType = "PARENT" | "LEAF";

export type WbsTask = {
  wbsTaskId: string;
  projectId: string;
  parentTaskId: string | null;
  taskType: WbsTaskType;
  name: string;
  description: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  plannedHours: number | null;
  progressRate: number | null;
  actualHours: number | null;
  hasStudyLogs: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WbsList = {
  projectId: string;
  ganttStartDate: string | null;
  ganttEndDate: string | null;
  plannedHours: number | null;
  actualHours: number;
  progressRate: number | null;
  hasDelay: boolean;
  tasks: WbsTask[];
};

export type WbsTaskCreateRequest = {
  taskType: WbsTaskType;
  name: string;
  description: string | null;
  parentTaskId: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  plannedHours: number | null;
};
