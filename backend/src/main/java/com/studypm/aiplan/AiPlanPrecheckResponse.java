package com.studypm.aiplan;

import java.util.List;

/**
 * AIを呼ばずに判定した生成前チェック結果を表す。
 */
public record AiPlanPrecheckResponse(boolean isValid, List<String> issues) {
    public static AiPlanPrecheckResponse valid() {
        return new AiPlanPrecheckResponse(true, List.of());
    }
}
