// 学習記録CRUDと、変更後に必要なWBS・プロジェクト集計の再取得を提供する。
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invalidateProjectStudyLogQueries } from "../projects/projectQueryInvalidation";
import { studyLogQueryKeys, studyLogsApi } from "./studyLogsApi";
import type { StudyLogCreateRequest, StudyLogListFilters, StudyLogUpdateRequest } from "./studyLogTypes";

type StudyLogUpdateVariables = {
  request: StudyLogUpdateRequest;
  studyLogId: string;
};

export const useProjectStudyLogs = (projectId: string | undefined, filters: StudyLogListFilters) =>
  useQuery({
    enabled: projectId !== undefined,
    queryKey: studyLogQueryKeys.list(projectId ?? "", filters),
    queryFn: () => {
      if (projectId === undefined) {
        throw new Error("projectId is required.");
      }
      return studyLogsApi.list(projectId, filters);
    },
  });

export const useCreateStudyLog = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: StudyLogCreateRequest) => studyLogsApi.create(projectId, request),
    onSuccess: () => invalidateProjectStudyLogQueries(queryClient, projectId),
  });
};

export const useUpdateStudyLog = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ request, studyLogId }: StudyLogUpdateVariables) => studyLogsApi.update(studyLogId, request),
    onSuccess: async (response) => {
      queryClient.setQueryData(studyLogQueryKeys.detail(response.studyLog.studyLogId), response.studyLog);
      await invalidateProjectStudyLogQueries(queryClient, projectId);
    },
  });
};

export const useDeleteStudyLog = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studyLogId: string) => studyLogsApi.delete(studyLogId),
    onSuccess: async (_response, studyLogId) => {
      queryClient.removeQueries({ queryKey: studyLogQueryKeys.detail(studyLogId) });
      await invalidateProjectStudyLogQueries(queryClient, projectId);
    },
  });
};
