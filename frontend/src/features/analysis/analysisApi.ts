// 進捗分析APIの取得とTanStack Queryキーを定義する。
import { apiClient } from "../../shared/api/apiClient";
import type { BurndownAnalysis, EvmAnalysis, PlanWarnings } from "./analysisTypes";

export const analysisQueryKeys = {
  all: (projectId: string) => ["projects", projectId, "analysis"] as const,
  burndown: (projectId: string) => ["projects", projectId, "analysis", "burndown"] as const,
  evm: (projectId: string) => ["projects", projectId, "analysis", "evm"] as const,
  planWarnings: (projectId: string) => ["projects", projectId, "analysis", "plan-warnings"] as const,
};

export const analysisApi = {
  evm: (projectId: string) => apiClient.request<EvmAnalysis>(`/api/projects/${projectId}/analysis/evm`),
  burndown: (projectId: string) =>
    apiClient.request<BurndownAnalysis>(`/api/projects/${projectId}/analysis/burndown`),
  planWarnings: (projectId: string) =>
    apiClient.request<PlanWarnings>(`/api/projects/${projectId}/analysis/plan-warnings`),
};
