package com.studypm.aiplan;

/**
 * OCRサービスから受け取った抽出テキストとページ数を表す。
 */
public record AiOcrProviderResult(String text, int detectedPageCount) {
}
