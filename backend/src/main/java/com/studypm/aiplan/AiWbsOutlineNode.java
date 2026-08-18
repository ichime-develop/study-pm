package com.studypm.aiplan;

import java.util.List;

/** OpenAIが入力教材から読み取った任意階層の学習項目を表す。 */
public record AiWbsOutlineNode(
        String temporaryKey,
        String parentTemporaryKey,
        String name,
        String description,
        Integer plannedEffortHundredths,
        List<String> sourceTemporaryKeys
) {
    public AiWbsOutlineNode {
        sourceTemporaryKeys = sourceTemporaryKeys == null ? List.of() : List.copyOf(sourceTemporaryKeys);
    }
}
