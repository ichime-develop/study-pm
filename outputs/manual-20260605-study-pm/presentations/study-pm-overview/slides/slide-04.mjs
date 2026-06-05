import { C, arrow, bg, body, footer, kicker, rect, text, title } from "./theme.mjs";

export async function slide04(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx);
  kicker(slide, ctx, "core loop");
  title(slide, ctx, "学習者は、目標から証拠までを1つのループで回せる。", { w: 940, h: 64, size: 34 });
  body(slide, ctx, "最終MVPの基本サイクルは、学習プロジェクト作成からAI計画、WBS、学習記録、進捗確認、質問管理までをつなぐ。", 58, 166, 850, 40, {
    size: 14.5,
  });

  const steps = [
    ["01", "目標を作る", "学習プロジェクト\nJava Silver / SQL / PM"],
    ["02", "計画案を作る", "教材目次 + 期限 +\n学習可能時間"],
    ["03", "WBSに分解", "親タスク / リーフ\n予定日・予定工数"],
    ["04", "実績を記録", "学習日 / 0.25h単位\nメモを残す"],
    ["05", "進捗を見る", "予定差 / 遅延 / EVM\nバーンダウン"],
    ["06", "疑問を戻す", "質問 / 回答メモ\nAI回答履歴"],
  ];
  steps.forEach(([num, label, sub], i) => {
    const x = 64 + i * 192;
    rect(slide, ctx, x, 284, 154, 166, i % 2 === 0 ? C.white : C.blue2, {
      line: { style: "solid", fill: C.line, width: 1 },
    });
    text(slide, ctx, num, x + 16, 304, 48, 22, { size: 14, color: C.blue, bold: true });
    text(slide, ctx, label, x + 16, 334, 122, 26, { size: 17, bold: true });
    body(slide, ctx, sub, x + 16, 378, 122, 52, { size: 11.5 });
    if (i < steps.length - 1) arrow(slide, ctx, x + 154, 367, x + 190, 367, i === 4 ? C.amber : C.blue, 3);
  });

  rect(slide, ctx, 236, 520, 802, 58, C.navy);
  text(slide, ctx, "重要: AI生成結果は直接保存せず、ユーザー確認後にプロジェクトとWBSへ保存する。", 270, 539, 736, 22, {
    size: 16,
    color: C.white,
    bold: true,
    align: "center",
  });
  footer(slide, ctx, 4, "Source: requirements.md final MVP basic cycle and AI plan requirements");
  return slide;
}
