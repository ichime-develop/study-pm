package com.studypm.aiplan;

import java.util.UUID;
import java.util.List;

/** AI下書きから作成した通常プロジェクトの識別子を返す。 */
public record AiPlanDraftConversionResponse(UUID projectId, List<UUID> wbsTaskIds) {
    public AiPlanDraftConversionResponse {
        wbsTaskIds = List.copyOf(wbsTaskIds);
    }
}
