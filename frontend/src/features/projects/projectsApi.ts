// プロジェクト一覧とユーザー単位サマリーAPIを呼び出す。
import { apiClient } from "../../shared/api/apiClient";
import type {
  ProjectBasic,
  ProjectCreateRequest,
  ProjectListFilters,
  ProjectListResponse,
  ProjectOverview,
  ProjectUpdateRequest,
  StudySummary,
} from "./projectTypes";

export const projectQueryKeys = {
  all: () => ["projects"] as const,
  list: (filters: ProjectListFilters) => ["projects", "list", filters] as const,
  detail: (projectId: string) => ["projects", projectId] as const,
  overview: (projectId: string) => ["projects", projectId, "overview"] as const,
  studySummary: () => ["projects", "study-summary"] as const,
};

export const projectsApi = {
  list: (filters: ProjectListFilters) =>
    apiClient.request<ProjectListResponse>(`/api/projects?${projectListSearchParams(filters)}`),

  studySummary: () => apiClient.request<StudySummary>("/api/me/study-summary"),

  get: (projectId: string) => apiClient.request<ProjectBasic>(`/api/projects/${projectId}`),

  overview: (projectId: string) =>
    apiClient.request<ProjectOverview>(`/api/projects/${projectId}/overview`),

  create: (request: ProjectCreateRequest) =>
    apiClient.request<ProjectBasic>("/api/projects", {
      method: "POST",
      body: request,
    }),

  update: (projectId: string, request: ProjectUpdateRequest) =>
    apiClient.request<ProjectBasic>(`/api/projects/${projectId}`, {
      method: "PATCH",
      body: request,
    }),

  delete: (projectId: string) =>
    apiClient.request<{ result: "OK" }>(`/api/projects/${projectId}`, {
      method: "DELETE",
    }),
};

const projectListSearchParams = (filters: ProjectListFilters): URLSearchParams => {
  const params = new URLSearchParams();
  const keyword = filters.keyword.trim();

  if (keyword.length > 0) {
    params.set("keyword", keyword);
  }
  if (filters.status !== "") {
    params.set("status", filters.status);
  }
  params.set("sort", filters.sort);
  params.set("page", String(filters.page));
  params.set("size", String(filters.size));
  return params;
};
