// プロジェクト内WBSの取得・作成状態をCM02とWB01で共有する。
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { projectQueryKeys } from "../projects/projectsApi";
import { wbsApi, wbsQueryKeys } from "./wbsApi";
import type { WbsTaskCreateRequest } from "./wbsTypes";

export const useProjectWbs = (projectId: string | undefined) =>
  useQuery({
    enabled: projectId !== undefined,
    queryKey: wbsQueryKeys.list(projectId ?? ""),
    queryFn: () => {
      if (projectId === undefined) {
        throw new Error("projectId is required.");
      }
      return wbsApi.list(projectId);
    },
  });

export const useCreateWbsTask = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: WbsTaskCreateRequest) => wbsApi.create(projectId, request),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wbsQueryKeys.list(projectId) }),
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.overview(projectId) }),
        queryClient.invalidateQueries({ queryKey: ["projects", "list"] }),
      ]);
    },
  });
};
