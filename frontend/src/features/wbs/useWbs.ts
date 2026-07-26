// プロジェクト内WBSのサーバー状態をCM02とWB01で共有する。
import { useQuery } from "@tanstack/react-query";

import { wbsApi, wbsQueryKeys } from "./wbsApi";

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
