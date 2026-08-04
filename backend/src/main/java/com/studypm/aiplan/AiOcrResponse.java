package com.studypm.aiplan;

/**
 * 教材目次画像1枚のOCR結果をPC Webへ返す。
 */
public record AiOcrResponse(String text, int detectedPageCount) {
}
