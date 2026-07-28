// 学習記録登録後にWBS、プロジェクト集計、ユーザー学習サマリーを再取得する。
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { projectQueryKeys } from "../projects/projectsApi";
import { invalidateWbsRelatedQueries } from "../wbs/useWbs";
import { studyLogsApi } from "./studyLogsApi";
import type { StudyLogCreateRequest } from "./studyLogTypes";

export const useCreateStudyLog = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: StudyLogCreateRequest) => studyLogsApi.create(projectId, request),
    onSuccess: async () => {
      await Promise.all([
        invalidateWbsRelatedQueries(queryClient, projectId),
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.studySummary() }),
      ]);
    },
  });
};
