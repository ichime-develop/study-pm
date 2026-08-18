// 概要・目次テキストから明示的な章見出しの概数を検出する。
const chapterPatterns = [
  /^\s*chapter\s*([0-9０-９]+)(?=\s|[:：.-]|$)/gim,
  /^\s*第\s*([0-9０-９一二三四五六七八九十百〇零]+)\s*章/gm,
  /^\s*([0-9０-９]+)\s*章(?=\s|[:：.-]|$)/gm,
];

export const countChapterHeadings = (text: string): number => {
  const chapterKeys = new Set<string>();
  chapterPatterns.forEach((pattern) => {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      chapterKeys.add(normalizeDigits(match[1]));
    }
  });
  return chapterKeys.size;
};

const normalizeDigits = (value: string): string => value.replace(/[０-９]/g, (digit) =>
  String.fromCharCode(digit.charCodeAt(0) - "０".charCodeAt(0) + "0".charCodeAt(0)));
