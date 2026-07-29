// プロジェクト配下の更新後に再取得すべきキャッシュ範囲を定義する。
import type { QueryClient } from "@tanstack/react-query";

import { analysisQueryKeys } from "../analysis/analysisApi";
import { studyLogQueryKeys } from "../studyLogs/studyLogsApi";
import { wbsQueryKeys } from "../wbs/wbsApi";
import { projectQueryKeys } from "./projectsApi";

export const invalidateProjectWbsQueries = async (
  queryClient: QueryClient,
  projectId: string,
  options: { includeProjectDetail?: boolean } = {},
) => {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: wbsQueryKeys.list(projectId) }),
    queryClient.invalidateQueries({ queryKey: projectQueryKeys.overview(projectId) }),
    queryClient.invalidateQueries({ queryKey: projectQueryKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: analysisQueryKeys.all(projectId) }),
  ];

  if (options.includeProjectDetail === true) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(projectId) }));
  }

  await Promise.all(invalidations);
};

export const invalidateProjectStudyLogQueries = async (queryClient: QueryClient, projectId: string) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: studyLogQueryKeys.all(projectId) }),
    invalidateProjectWbsQueries(queryClient, projectId),
    queryClient.invalidateQueries({ queryKey: projectQueryKeys.studySummary() }),
  ]);
};
