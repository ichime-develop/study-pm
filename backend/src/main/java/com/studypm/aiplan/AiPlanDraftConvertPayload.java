package com.studypm.aiplan;

import jakarta.validation.constraints.Min;

/** AI下書きを通常プロジェクトへ変換する際の楽観ロック用入力を表す。 */
public record AiPlanDraftConvertPayload(@Min(1) int draftRevision) {
}
