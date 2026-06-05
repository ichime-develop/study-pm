import { C, bg, body, footer, kicker, rect, rule, text, title } from "./theme.mjs";

export async function slide01(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, C.navy);
  rect(slide, ctx, 0, 0, 460, ctx.H, "#0B1222");
  rect(slide, ctx, 58, 56, 54, 54, C.blue);
  text(slide, ctx, "SP", 58, 67, 54, 30, { size: 19, color: C.white, bold: true, align: "center" });
  text(slide, ctx, "Study PM", 128, 58, 220, 28, { size: 22, color: C.white, bold: true });
  text(slide, ctx, "PC Web Mock Overview", 128, 89, 260, 20, { size: 11, color: "#AAB4C4" });
  kicker(slide, ctx, "overview", { y: 154, textColor: "#AAB4C4" });
  title(slide, ctx, "独学を、測定できる\n学習プロジェクトに変える。", {
    x: 58,
    y: 196,
    w: 790,
    h: 118,
    size: 38,
    color: C.white,
  });
  body(
    slide,
    ctx,
    "教材、予定、実績、遅延、疑問が分断される独学を、WBSと学習記録、EVM、質問管理でひとつの運用サイクルにまとめるPC Webアプリ。",
    58,
    338,
    590,
    80,
    { size: 16, color: "#CBD5E1" },
  );

  const rails = [
    ["01", "学習目標をプロジェクト化", "期間・分野・状態・工数を管理単位として持つ"],
    ["02", "WBSで学習を実行可能に分解", "親タスクは配下リーフから自動集計"],
    ["03", "実績と疑問を次の行動へ戻す", "ログ、進捗、質問、AI回答を同じ文脈に置く"],
  ];
  rails.forEach((item, i) => {
    const y = 462 + i * 58;
    rule(slide, ctx, 58, y - 12, 620, "#233047", 1);
    text(slide, ctx, item[0], 58, y, 40, 22, { size: 13, color: C.blue, bold: true });
    text(slide, ctx, item[1], 116, y - 2, 270, 22, { size: 15, color: C.white, bold: true });
    body(slide, ctx, item[2], 398, y, 300, 28, { size: 11.5, color: "#AAB4C4" });
  });

  rect(slide, ctx, 760, 88, 410, 500, "#F8FAFC");
  rect(slide, ctx, 790, 120, 96, 420, "#111827");
  ["Dashboard", "Projects", "WBS", "Logs", "Questions", "AI Plan"].forEach((label, i) => {
    rect(slide, ctx, 812, 154 + i * 54, 52, 10, i === 0 ? C.blue : "#2B3548");
    text(slide, ctx, label, 812, 168 + i * 54, 58, 14, { size: 7.5, color: "#CBD5E1" });
  });
  rect(slide, ctx, 914, 126, 220, 64, C.blue2);
  text(slide, ctx, "基準日 2026-06-05", 936, 144, 150, 20, { size: 12, color: C.blue, bold: true });
  rect(slide, ctx, 914, 214, 220, 118, C.white, { line: { style: "solid", fill: C.line, width: 1 } });
  text(slide, ctx, "Java Silver 合格", 936, 236, 160, 22, { size: 16, bold: true });
  rect(slide, ctx, 936, 278, 150, 10, C.blue2);
  rect(slide, ctx, 936, 278, 51, 10, C.blue);
  text(slide, ctx, "34% progress", 936, 296, 120, 16, { size: 10, color: C.soft });
  rect(slide, ctx, 914, 360, 220, 72, C.amber2);
  text(slide, ctx, "計画外タスクを警告", 936, 385, 150, 20, { size: 13, color: C.amber, bold: true });
  rect(slide, ctx, 914, 458, 220, 82, C.green2);
  text(slide, ctx, "質問とAI回答を保存", 936, 490, 160, 20, { size: 13, color: C.green, bold: true });
  footer(slide, ctx, 1, "Source: requirements.md, ui-mock screen plan, React mock data");
  return slide;
}
