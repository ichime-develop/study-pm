// プロジェクト単位の進捗分析データをTanStack Queryで取得する。
import { useQuery } from "@tanstack/react-query";

import { analysisApi, analysisQueryKeys } from "./analysisApi";

const useProjectAnalysisQuery = <Data>(
  projectId: string | undefined,
  queryKey: readonly unknown[],
  queryFn: (id: string) => Promise<Data>,
) =>
  useQuery({
    enabled: projectId !== undefined,
    queryKey,
    queryFn: () => {
      if (projectId === undefined) {
        throw new Error("projectId is required.");
      }
      return queryFn(projectId);
    },
  });

export const useProjectEvm = (projectId: string | undefined) =>
  useProjectAnalysisQuery(projectId, analysisQueryKeys.evm(projectId ?? ""), analysisApi.evm);

export const useProjectBurndown = (projectId: string | undefined) =>
  useProjectAnalysisQuery(projectId, analysisQueryKeys.burndown(projectId ?? ""), analysisApi.burndown);

export const useProjectPlanWarnings = (projectId: string | undefined) =>
  useProjectAnalysisQuery(projectId, analysisQueryKeys.planWarnings(projectId ?? ""), analysisApi.planWarnings);
