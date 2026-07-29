package com.studypm.aiplan;

/**
 * 外部サービスの詳細を出さない安定したジョブ失敗情報を表す。
 */
public record AiGenerationJobError(String code, String message) {
}
