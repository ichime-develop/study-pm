// API-SL-02の学習記録登録リクエストをAPIクライアントへ集約する。
import { apiClient } from "../../shared/api/apiClient";

import type { StudyLogCreateRequest, StudyLogMutationResponse } from "./studyLogTypes";

export const studyLogsApi = {
  create: (projectId: string, request: StudyLogCreateRequest) =>
    apiClient.request<StudyLogMutationResponse>(`/api/projects/${projectId}/study-logs`, {
      method: "POST",
      body: request,
    }),
};
