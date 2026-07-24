// プロジェクト一覧とユーザー単位サマリーAPIを呼び出す。
import { apiClient } from "../../shared/api/apiClient";
import type { ProjectListFilters, ProjectListResponse, StudySummary } from "./projectTypes";

export const projectQueryKeys = {
  list: (filters: ProjectListFilters) => ["projects", "list", filters] as const,
  studySummary: () => ["projects", "study-summary"] as const,
};

export const projectsApi = {
  list: (filters: ProjectListFilters) =>
    apiClient.request<ProjectListResponse>(`/api/projects?${projectListSearchParams(filters)}`),

  studySummary: () => apiClient.request<StudySummary>("/api/me/study-summary"),
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
