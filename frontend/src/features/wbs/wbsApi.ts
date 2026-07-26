// WBS一覧を取得し、CM02と将来のWB01で同じキャッシュを共有する。
import { apiClient } from "../../shared/api/apiClient";

import type {
  WbsList,
  WbsProgressUpdateRequest,
  WbsProgressUpdateResponse,
  WbsTask,
  WbsTaskCreateRequest,
  WbsTaskUpdateRequest,
} from "./wbsTypes";

export const wbsQueryKeys = {
  list: (projectId: string) => ["projects", projectId, "wbs"] as const,
};

export const wbsApi = {
  list: (projectId: string) => apiClient.request<WbsList>(`/api/projects/${projectId}/wbs`),

  create: (projectId: string, request: WbsTaskCreateRequest) =>
    apiClient.request<WbsTask>(`/api/projects/${projectId}/wbs-tasks`, {
      method: "POST",
      body: request,
    }),

  update: (taskId: string, request: WbsTaskUpdateRequest) =>
    apiClient.request<WbsTask>(`/api/wbs-tasks/${taskId}`, {
      method: "PATCH",
      body: request,
    }),

  updateProgress: (taskId: string, request: WbsProgressUpdateRequest) =>
    apiClient.request<WbsProgressUpdateResponse>(`/api/wbs-tasks/${taskId}/progress`, {
      method: "PATCH",
      body: request,
    }),

  delete: (taskId: string) =>
    apiClient.request<{ result: "OK" }>(`/api/wbs-tasks/${taskId}`, {
      method: "DELETE",
    }),
};
