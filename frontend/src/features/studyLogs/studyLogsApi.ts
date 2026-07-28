// 学習記録の一覧、登録、更新、削除APIをAPIクライアントへ集約する。
import { apiClient } from "../../shared/api/apiClient";

import type {
  StudyLogCreateRequest,
  StudyLogDeleteResponse,
  StudyLogListFilters,
  StudyLogListResponse,
  StudyLogMutationResponse,
  StudyLogUpdateRequest,
} from "./studyLogTypes";

export const studyLogQueryKeys = {
  all: (projectId: string) => ["projects", projectId, "study-logs"] as const,
  detail: (studyLogId: string) => ["study-logs", studyLogId] as const,
  list: (projectId: string, filters: StudyLogListFilters) =>
    ["projects", projectId, "study-logs", filters] as const,
};

export const studyLogsApi = {
  list: (projectId: string, filters: StudyLogListFilters) =>
    apiClient.request<StudyLogListResponse>(`/api/projects/${projectId}/study-logs?${studyLogSearchParams(filters)}`),

  create: (projectId: string, request: StudyLogCreateRequest) =>
    apiClient.request<StudyLogMutationResponse>(`/api/projects/${projectId}/study-logs`, {
      method: "POST",
      body: request,
    }),

  update: (studyLogId: string, request: StudyLogUpdateRequest) =>
    apiClient.request<StudyLogMutationResponse>(`/api/study-logs/${studyLogId}`, {
      method: "PATCH",
      body: request,
    }),

  delete: (studyLogId: string) =>
    apiClient.request<StudyLogDeleteResponse>(`/api/study-logs/${studyLogId}`, {
      method: "DELETE",
    }),
};

const studyLogSearchParams = (filters: StudyLogListFilters): URLSearchParams => {
  const params = new URLSearchParams({
    page: String(filters.page),
    size: String(filters.size),
  });
  if (filters.taskId !== "") {
    params.set("taskId", filters.taskId);
  }
  return params;
};
