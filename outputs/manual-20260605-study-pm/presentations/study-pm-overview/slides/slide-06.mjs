import { C, bg, body, footer, kicker, rect, rule, text, title } from "./theme.mjs";

export async function slide06(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, "#FBF8F1");
  kicker(slide, ctx, "project control");
  title(slide, ctx, "モックは、遅延を早く見るための管理信号をすでに持っている。", {
    w: 980,
    h: 64,
    size: 33,
  });
  body(slide, ctx, "Java Silver 合格サンプルでは、リーフタスクの予定工数・実績工数・進捗率からプロジェクト状態を集計する。", 58, 166, 850, 34, {
    size: 14.5,
  });

  rect(slide, ctx, 76, 246, 452, 310, C.navy);
  text(slide, ctx, "Java Silver 合格", 112, 282, 290, 34, { size: 27, color: C.white, bold: true });
  body(slide, ctx, "基準日 2026-06-05 / Java基礎、クラス設計、例外、コレクションを確認する学習プロジェクト。", 112, 328, 330, 48, {
    size: 12.5,
    color: "#CBD5E1",
  });
  const metrics = [
    ["予定工数", "20h"],
    ["実績工数", "5.25h"],
    ["進捗率", "34%"],
  ];
  metrics.forEach(([label, value], i) => {
    const x = 112 + i * 124;
    text(slide, ctx, value, x, 424, 92, 36, { size: 26, color: i === 2 ? C.green : C.white, bold: true });
    text(slide, ctx, label, x, 462, 92, 18, { size: 10.5, color: "#94A3B8" });
  });
  rect(slide, ctx, 112, 506, 330, 12, "#2E3A4E");
  rect(slide, ctx, 112, 506, 112, 12, C.green);
  text(slide, ctx, "Weighted progress from leaf tasks", 112, 526, 240, 14, { size: 8.5, color: "#94A3B8" });

  const bars = [
    ["第1章を読む", 4, 4, 100, C.green],
    ["章末問題を解く", 3, 1.25, 60, C.blue],
    ["クラス定義を読む", 5, 0, 20, C.amber],
    ["継承の問題を解く", 6, 0, 0, C.line],
    ["模擬試験", 2, 0, 0, C.red],
  ];
  text(slide, ctx, "WBS leaf task signal", 610, 246, 270, 26, { size: 18, bold: true });
  bars.forEach(([label, planned, actual, progress, color], i) => {
    const y = 296 + i * 52;
    text(slide, ctx, label, 610, y, 180, 18, { size: 11.5, bold: i < 2 });
    rect(slide, ctx, 804, y + 3, 210, 10, C.blue2);
    rect(slide, ctx, 804, y + 3, 210 * (progress / 100), 10, color);
    text(slide, ctx, `${progress}%`, 1028, y - 1, 48, 16, { size: 10, color: C.soft });
    text(slide, ctx, `${planned}h plan / ${actual}h actual`, 610, y + 22, 210, 14, { size: 8.5, color: C.soft });
    rule(slide, ctx, 610, y + 42, 500, C.line, 1);
  });
  rect(slide, ctx, 610, 566, 508, 44, C.amber2);
  text(slide, ctx, "Warning modeled: プロジェクト期間外タスクを検出できる", 630, 580, 440, 16, {
    size: 12.5,
    color: C.amber,
    bold: true,
  });
  footer(slide, ctx, 6, "Source: mockData.ts sample state and calculations.ts aggregation logic");
  return slide;
}
