// プロジェクト一覧画面で必要なサーバー状態をTanStack Queryで取得する。
import { useQuery } from "@tanstack/react-query";

import { projectQueryKeys, projectsApi } from "./projectsApi";
import type { ProjectListFilters } from "./projectTypes";

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
