import { C, bg, body, footer, kicker, rect, rule, text, title } from "./theme.mjs";

export async function slide08(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.navy);
  kicker(slide, ctx, "decisions", { textColor: "#AAB4C4", color: C.amber });
  title(slide, ctx, "次のマイルストーンは、バックエンド実装前に振る舞いの契約を固定すること。", {
    w: 980,
    size: 33,
    color: C.white,
  });
  body(slide, ctx, "画面モックで見えている入力制約、集計ルール、AI送信範囲、MVP境界を仕様へ落とし、DB/API設計へ進める。", 58, 202, 860, 40, {
    size: 14.5,
    color: "#CBD5E1",
  });

  const decisions = [
    ["01", "集計ルール", "親タスク、プロジェクト、EVM、バーンダウンをどの履歴から算出するか"],
    ["02", "AI送信契約", "質問回答と学習計画生成で、どの情報を外部送信可能にするか"],
    ["03", "MVP境界", "段階リリースをどこで切り、受入確認をどの画面で行うか"],
  ];
  decisions.forEach(([num, label, sub], i) => {
    const y = 292 + i * 86;
    rule(slide, ctx, 84, y - 14, 820, "#334155", 1);
    text(slide, ctx, num, 84, y, 44, 26, { size: 17, color: C.amber, bold: true });
    text(slide, ctx, label, 154, y - 2, 180, 26, { size: 19, color: C.white, bold: true });
    body(slide, ctx, sub, 360, y, 520, 34, { size: 12.5, color: "#AAB4C4" });
  });

  rect(slide, ctx, 954, 262, 210, 268, "#F8FAFC");
  text(slide, ctx, "Next output", 986, 296, 150, 22, { size: 18, bold: true, align: "center" });
  ["DB設計", "API設計", "業務ロジック設計", "受入観点"].forEach((label, i) => {
    rect(slide, ctx, 990, 344 + i * 42, 136, 24, i === 0 ? C.blue2 : "#FFFFFF", {
      line: { style: "solid", fill: C.line, width: 1 },
    });
    text(slide, ctx, label, 1000, 349 + i * 42, 116, 12, { size: 10.5, color: C.ink, align: "center", bold: i === 0 });
  });
  footer(slide, ctx, 8, "Source: requirements.md document purpose and current UI mock scope");
  return slide;
}
