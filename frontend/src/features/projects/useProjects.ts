// プロジェクト一覧画面で必要なサーバー状態をTanStack Queryで取得する。
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { projectQueryKeys, projectsApi } from "./projectsApi";
import type { ProjectCreateRequest, ProjectListFilters, ProjectUpdateRequest } from "./projectTypes";

export const useProjectList = (filters: ProjectListFilters) =>
  useQuery({
    queryKey: projectQueryKeys.list(filters),
    queryFn: () => projectsApi.list(filters),
  });

export const useStudySummary = () =>
  useQuery({
    queryKey: projectQueryKeys.studySummary(),
    queryFn: projectsApi.studySummary,
  });

export const useProject = (projectId: string | undefined) =>
  useQuery({
    enabled: projectId !== undefined,
    queryKey: projectQueryKeys.detail(projectId ?? ""),
    queryFn: () => {
      if (projectId === undefined) {
        throw new Error("projectId is required.");
      }
      return projectsApi.get(projectId);
    },
  });

export const useProjectOverview = (projectId: string | undefined) =>
  useQuery({
    enabled: projectId !== undefined,
    queryKey: projectQueryKeys.overview(projectId ?? ""),
    queryFn: () => {
      if (projectId === undefined) {
        throw new Error("projectId is required.");
      }
      return projectsApi.overview(projectId);
    },
  });

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProjectCreateRequest) => projectsApi.create(request),
    onSuccess: async (project) => {
      queryClient.setQueryData(projectQueryKeys.detail(project.projectId), project);
      await queryClient.invalidateQueries({ queryKey: projectQueryKeys.all() });
    },
  });
};

export const useUpdateProject = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProjectUpdateRequest) => projectsApi.update(projectId, request),
    onSuccess: async (project) => {
      queryClient.setQueryData(projectQueryKeys.detail(project.projectId), project);
      await queryClient.invalidateQueries({ queryKey: projectQueryKeys.all() });
    },
  });
};

export const useDeleteProject = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => projectsApi.delete(projectId),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: projectQueryKeys.detail(projectId) });
      await queryClient.invalidateQueries({ queryKey: projectQueryKeys.all() });
    },
  });
};
