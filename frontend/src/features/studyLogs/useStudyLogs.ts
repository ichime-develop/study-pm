// 学習記録CRUDと、変更後に必要なWBS・プロジェクト集計の再取得を提供する。
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { projectQueryKeys } from "../projects/projectsApi";
import { invalidateWbsRelatedQueries } from "../wbs/useWbs";
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
    onSuccess: () => invalidateStudyLogRelatedQueries(queryClient, projectId),
  });
};

export const useUpdateStudyLog = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ request, studyLogId }: StudyLogUpdateVariables) => studyLogsApi.update(studyLogId, request),
    onSuccess: async (response) => {
      queryClient.setQueryData(studyLogQueryKeys.detail(response.studyLog.studyLogId), response.studyLog);
      await invalidateStudyLogRelatedQueries(queryClient, projectId);
    },
  });
};

export const useDeleteStudyLog = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studyLogId: string) => studyLogsApi.delete(studyLogId),
    onSuccess: async (_response, studyLogId) => {
      queryClient.removeQueries({ queryKey: studyLogQueryKeys.detail(studyLogId) });
      await invalidateStudyLogRelatedQueries(queryClient, projectId);
    },
  });
};

const invalidateStudyLogRelatedQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: studyLogQueryKeys.all(projectId) }),
    invalidateWbsRelatedQueries(queryClient, projectId),
    queryClient.invalidateQueries({ queryKey: projectQueryKeys.studySummary() }),
  ]);
};
