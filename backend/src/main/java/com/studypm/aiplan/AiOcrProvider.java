package com.studypm.aiplan;

/**
 * 教材目次画像のOCRを外部サービスへ委譲する境界を定義する。
 */
public interface AiOcrProvider {

    AiOcrProviderResult extractDocumentText(byte[] imageContent);
}
