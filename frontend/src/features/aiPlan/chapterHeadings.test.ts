// 概要入力の作成方法案内に使う章見出し検出を検証する。
import { describe, expect, it } from "vitest";

import { countChapterHeadings } from "./chapterHeadings";

describe("countChapterHeadings", () => {
  it("英語・日本語・全角数字の章見出しを重複排除する", () => {
    const text = "Chapter 1 基礎\nChapter １ 再掲\n第2章 実践\n3章 応用\n01 節";

    expect(countChapterHeadings(text)).toBe(3);
  });

  it("章と明示されていない番号行は数えない", () => {
    expect(countChapterHeadings("01 はじめに\n02 基本文法\n03 テスト")).toBe(0);
  });
});
