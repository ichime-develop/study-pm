package com.studypm.aiplan;

import java.util.List;

/**
 * 外部サービスの詳細を出さない安定したジョブ失敗情報を表す。
 */
public record AiGenerationJobError(String code, String message, List<String> actionHints) {
}
