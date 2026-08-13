// AI計画APIのキャッシュ、ポーリング、更新後の再取得を管理する。
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { aiPlanApi, aiPlanQueryKeys } from "./aiPlanApi";
import type { AiPlanDraftUpdatePayload, AiPlanRequestPayload } from "./aiPlanTypes";

export const useAiPlanRequest = (requestId: string | undefined) =>
  useQuery({
    enabled: requestId !== undefined,
    queryFn: () => aiPlanApi.getRequest(requestId as string),
    queryKey: aiPlanQueryKeys.request(requestId ?? ""),
  });

export const useAiGenerationJob = (jobId: string | undefined) =>
  useQuery({
    enabled: jobId !== undefined,
    queryFn: () => aiPlanApi.getJob(jobId as string),
    queryKey: aiPlanQueryKeys.job(jobId ?? ""),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "QUEUED" || status === "PROCESSING" || status === "CANCEL_REQUESTED" ? 1500 : false;
    },
  });

export const useAiPlanDraft = (draftId: string | undefined) =>
  useQuery({
    enabled: draftId !== undefined,
    queryFn: () => aiPlanApi.getDraft(draftId as string),
    queryKey: aiPlanQueryKeys.draft(draftId ?? ""),
  });

export const useSaveAiPlanRequest = (requestId: string | undefined) =>
  useMutation({
    mutationFn: (payload: AiPlanRequestPayload) =>
      requestId === undefined ? aiPlanApi.createRequest(payload) : aiPlanApi.updateRequest(requestId, payload),
  });

export const useUpdateAiPlanDraft = (draftId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AiPlanDraftUpdatePayload) => aiPlanApi.updateDraft(draftId, payload),
    onSuccess: (draft) => queryClient.setQueryData(aiPlanQueryKeys.draft(draftId), draft),
  });
};

export const useConvertAiPlanDraft = (draftId: string) =>
  useMutation({ mutationFn: (draftRevision: number) => aiPlanApi.convertDraft(draftId, draftRevision) });
