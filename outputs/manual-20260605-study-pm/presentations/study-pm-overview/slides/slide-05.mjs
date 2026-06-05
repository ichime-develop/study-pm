import { C, bg, body, footer, kicker, rect, rule, text, title } from "./theme.mjs";

export async function slide05(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, "#FFFFFF");
  kicker(slide, ctx, "mvp shape");
  title(slide, ctx, "MVPは、計画管理を先に成立させてから\n可視化・知識化・AI支援を足す。", {
    w: 1020,
    h: 94,
    size: 32,
  });
  body(slide, ctx, "画面モックは最終MVPの主要15画面を先に検証し、段階リリースの境界を確認するためのもの。", 58, 190, 820, 36, {
    size: 14.5,
  });

  const releases = [
    ["MVP 1", "学習計画と実績を管理できる", "認証 / プロジェクト / WBS / 学習記録 / 基本ダッシュボード", C.blue],
    ["MVP 2", "計画との差を可視化できる", "進捗履歴 / 計画履歴 / EVM / バーンダウン / 遅延表示", C.amber],
    ["MVP 3", "学習中の疑問を蓄積できる", "質問管理 / 回答メモ", C.green],
    ["MVP 4", "AIを学習支援へ利用できる", "AI回答 / 回答履歴 / 教材OCR / AI学習計画生成", "#7C3AED"],
  ];
  releases.forEach(([mvp, claim, details, color], i) => {
    const y = 250 + i * 82;
    rect(slide, ctx, 76, y, 88, 44, color);
    text(slide, ctx, mvp, 76, y + 12, 88, 18, { size: 13, color: C.white, bold: true, align: "center" });
    rule(slide, ctx, 164, y + 22, 850, color, 2);
    text(slide, ctx, claim, 194, y - 2, 430, 24, { size: 17, bold: true });
    body(slide, ctx, details, 194, y + 28, 760, 24, { size: 11.8 });
  });

  rect(slide, ctx, 964, 236, 196, 344, C.navy);
  text(slide, ctx, "15", 1002, 278, 120, 82, { size: 66, color: C.white, bold: true, align: "center" });
  text(slide, ctx, "PC Web screens", 1002, 358, 120, 20, { size: 13, color: "#CBD5E1", align: "center" });
  body(slide, ctx, "優先順はダッシュボード、プロジェクト一覧、詳細、WBS編集、学習記録登録から。", 996, 420, 132, 86, {
    size: 12,
    color: "#CBD5E1",
    align: "center",
  });
  footer(slide, ctx, 5, "Source: requirements.md phased release table, ui-mock screen plan");
  return slide;
}
