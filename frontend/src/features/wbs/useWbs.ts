// プロジェクト内WBSの取得・作成・更新・削除状態をCM02とWB01で共有する。
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { projectQueryKeys } from "../projects/projectsApi";
import { wbsApi, wbsQueryKeys } from "./wbsApi";
import type { WbsProgressUpdateRequest, WbsTaskCreateRequest, WbsTaskUpdateRequest } from "./wbsTypes";

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
    onSuccess: () => invalidateWbsRelatedQueries(queryClient, projectId),
  });
};

export const useUpdateWbsTask = (projectId: string, taskId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: WbsTaskUpdateRequest) => wbsApi.update(taskId, request),
    onSuccess: () => invalidateWbsRelatedQueries(queryClient, projectId),
  });
};

export const useUpdateWbsProgress = (projectId: string, taskId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: WbsProgressUpdateRequest) => wbsApi.updateProgress(taskId, request),
    onSuccess: () => invalidateWbsRelatedQueries(queryClient, projectId, true),
  });
};

export const useDeleteWbsTask = (projectId: string, taskId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => wbsApi.delete(taskId),
    onSuccess: () => invalidateWbsRelatedQueries(queryClient, projectId),
  });
};

const invalidateWbsRelatedQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  includesProjectDetail = false,
) => {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: wbsQueryKeys.list(projectId) }),
    queryClient.invalidateQueries({ queryKey: projectQueryKeys.overview(projectId) }),
    queryClient.invalidateQueries({ queryKey: projectQueryKeys.lists() }),
  ];
  if (includesProjectDetail) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(projectId) }));
  }
  await Promise.all(invalidations);
};
