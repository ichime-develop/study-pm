import { C, arrow, bg, body, footer, kicker, node, rect, text, title } from "./theme.mjs";

export async function slide03(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx, "#FBF8F1");
  kicker(slide, ctx, "product system");
  title(slide, ctx, "ダッシュボードが、すべての学習シグナルを\nプロジェクトへ戻す。", {
    w: 960,
    h: 84,
    size: 32,
  });
  body(slide, ctx, "PC Webモックは15画面を切り替え、計画・実績・質問・AI計画を同じアプリシェルで検証する。", 58, 178, 760, 34, {
    size: 14.5,
  });

  rect(slide, ctx, 482, 306, 316, 132, C.navy);
  text(slide, ctx, "Dashboard", 526, 334, 230, 34, { size: 28, color: C.white, bold: true, align: "center" });
  body(slide, ctx, "今日やること / 進行中 / 遅延 / 直近ログ / 未解決質問", 516, 378, 250, 42, {
    size: 12,
    color: "#CBD5E1",
    align: "center",
  });

  const modules = [
    ["学習プロジェクト", "名称・分野・期間・状態", 88, 236, C.white],
    ["WBS", "最大5階層 / リーフ入力", 154, 466, C.blue2],
    ["学習記録", "0.25h単位 / メモ / 再集計", 532, 486, C.green2],
    ["EVM・バーンダウン", "BAC / PV / EV / AC / SPI / CPI", 890, 466, C.white],
    ["質問・回答メモ", "未解決 / 調査中 / 解決済み", 958, 236, C.amber2],
    ["AI学習計画", "目次OCR / WBS案 / 保存前確認", 532, 204, C.white],
  ];
  modules.forEach(([label, sub, x, y, fill]) => node(slide, ctx, label, sub, x, y, 220, 92, { fill }));
  arrow(slide, ctx, 308, 282, 482, 352, C.blue, 3);
  arrow(slide, ctx, 374, 512, 482, 394, C.blue, 3);
  arrow(slide, ctx, 642, 486, 642, 438, C.blue, 3);
  arrow(slide, ctx, 890, 512, 798, 394, C.blue, 3);
  arrow(slide, ctx, 958, 282, 798, 352, C.amber, 3);
  arrow(slide, ctx, 642, 296, 642, 306, C.blue, 3);

  rect(slide, ctx, 58, 616, 1040, 30, "#00000000", { line: { style: "solid", fill: C.line, width: 1 } });
  text(slide, ctx, "System rule: リーフタスクの予定・実績・進捗が、親タスクとプロジェクトの集計値を作る。", 78, 622, 920, 18, {
    size: 12,
    color: C.soft,
  });
  footer(slide, ctx, 3, "Source: App.tsx, requirements.md scope, calculations.ts aggregation rules");
  return slide;
}
