package com.studypm.aiplan;

/**
 * OpenAIが提案するプロジェクト名と概要を表す。
 * プロジェクト期間は生成依頼を正本とするため保持しない。
 */
public record AiWbsGenerationProject(
        String name,
        String description
) {
}
