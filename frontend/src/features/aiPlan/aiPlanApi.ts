// AI計画のOCR、入力保存、生成ジョブ、下書き編集・変換APIを呼び出す。
import { apiClient } from "../../shared/api/apiClient";
import type {
  AiGenerationJob,
  AiOcrResponse,
  AiPlanDraft,
  AiPlanDraftConversion,
  AiPlanDraftUpdatePayload,
  AiPlanRequestPayload,
  AiPlanRequestResponse,
} from "./aiPlanTypes";

export const aiPlanQueryKeys = {
  all: () => ["ai-plan"] as const,
  request: (requestId: string) => ["ai-plan", "requests", requestId] as const,
  job: (jobId: string) => ["ai-plan", "jobs", jobId] as const,
  draft: (draftId: string) => ["ai-plan", "drafts", draftId] as const,
};

export const aiPlanApi = {
  extractOcrText: (image: File) => {
    const formData = new FormData();
    formData.append("image", image);
    return apiClient.request<AiOcrResponse>("/api/ai-plan/ocr", {
      method: "POST",
      body: formData,
    });
  },
  createRequest: (payload: AiPlanRequestPayload) =>
    apiClient.request<AiPlanRequestResponse>("/api/ai-plan/requests", {
      method: "POST",
      body: payload,
    }),
  getRequest: (requestId: string) =>
    apiClient.request<AiPlanRequestResponse>(`/api/ai-plan/requests/${requestId}`),
  updateRequest: (requestId: string, payload: AiPlanRequestPayload) =>
    apiClient.request<AiPlanRequestResponse>(`/api/ai-plan/requests/${requestId}`, {
      method: "PUT",
      body: payload,
    }),
  createDraftJob: (requestId: string, isDeadlinePriority = false) =>
    apiClient.request<AiGenerationJob>(`/api/ai-plan/requests/${requestId}/draft-jobs`, {
      method: "POST",
      body: { deadlinePriority: isDeadlinePriority },
    }),
  getJob: (jobId: string) => apiClient.request<AiGenerationJob>(`/api/ai-plan/jobs/${jobId}`),
  cancelJob: (jobId: string) =>
    apiClient.request<AiGenerationJob>(`/api/ai-plan/jobs/${jobId}/cancel`, { method: "POST" }),
  getDraft: (draftId: string) => apiClient.request<AiPlanDraft>(`/api/ai-plan/drafts/${draftId}`),
  updateDraft: (draftId: string, payload: AiPlanDraftUpdatePayload) =>
    apiClient.request<AiPlanDraft>(`/api/ai-plan/drafts/${draftId}`, {
      method: "PUT",
      body: payload,
    }),
  convertDraft: (draftId: string, draftRevision: number) =>
    apiClient.request<AiPlanDraftConversion>(`/api/ai-plan/drafts/${draftId}/convert`, {
      method: "POST",
      body: { draftRevision },
    }),
};
