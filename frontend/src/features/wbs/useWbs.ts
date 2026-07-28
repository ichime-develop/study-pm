// プロジェクト内WBSの取得・作成・更新・削除状態をCM02とWB01で共有する。
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invalidateProjectWbsQueries } from "../projects/projectQueryInvalidation";
import { wbsApi, wbsQueryKeys } from "./wbsApi";
import type { WbsProgressUpdateRequest, WbsTaskCreateRequest, WbsTaskUpdateRequest } from "./wbsTypes";

type WbsTaskUpdateVariables = {
  request: WbsTaskUpdateRequest;
  taskId: string;
};

type WbsProgressUpdateVariables = {
  request: WbsProgressUpdateRequest;
  taskId: string;
};

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
    onSuccess: () => invalidateProjectWbsQueries(queryClient, projectId),
  });
};

export const useUpdateWbsTask = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ request, taskId }: WbsTaskUpdateVariables) => wbsApi.update(taskId, request),
    onSuccess: () => invalidateProjectWbsQueries(queryClient, projectId),
  });
};

export const useUpdateWbsProgress = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ request, taskId }: WbsProgressUpdateVariables) => wbsApi.updateProgress(taskId, request),
    onSuccess: () => invalidateProjectWbsQueries(queryClient, projectId, { includeProjectDetail: true }),
  });
};

export const useDeleteWbsTask = (projectId: string, taskId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => wbsApi.delete(taskId),
    onSuccess: () => invalidateProjectWbsQueries(queryClient, projectId),
  });
};
