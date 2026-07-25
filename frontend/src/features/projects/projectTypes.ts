// プロジェクト一覧と学習サマリーAPIのレスポンス型を表す。
import type { PageResponse } from "../../shared/api/apiTypes";

export type ProjectStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export type ProjectListItem = {
  projectId: string;
  name: string;
  description: string | null;
  startDate: string;
  targetEndDate: string;
  status: ProjectStatus;
  plannedHours: number | null;
  actualHours: number;
  progressRate: number | null;
  hasDelay: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectListResponse = {
  items: ProjectListItem[];
  page: PageResponse;
};

export type ProjectBasic = {
  projectId: string;
  name: string;
  description: string | null;
  startDate: string;
  targetEndDate: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProjectCreateRequest = {
  name: string;
  description: string | null;
  startDate: string;
  targetEndDate: string;
};

export type ProjectUpdateRequest = ProjectCreateRequest & {
  status: ProjectStatus;
};

export type ProjectListFilters = {
  keyword: string;
  status: ProjectStatus | "";
  sort: ProjectSort;
  page: number;
  size: number;
};

export type ProjectSort =
  | "updatedAtDesc"
  | "updatedAtAsc"
  | "startDateAsc"
  | "startDateDesc"
  | "targetEndDateAsc"
  | "targetEndDateDesc"
  | "progressRateAsc"
  | "progressRateDesc";

export type StudySummary = {
  continuousStudyDays: number;
  totalStudyHours: number;
  inProgressProjectCount: number;
};
