import { C, arrow, bg, body, footer, kicker, node, rect, text, title } from "./theme.mjs";

export async function slide02(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx);
  kicker(slide, ctx, "user problem");
  title(slide, ctx, "課題は「やる気」ではなく、\n計画・実績・遅延・疑問の分断。", {
    w: 1000,
    h: 92,
    size: 32,
  });
  body(
    slide,
    ctx,
    "独学では教材や目標を決めても、学習範囲の分解、予定と実績の比較、遅延の把握、疑問点の管理が別々になりやすい。",
    58,
    176,
    740,
    52,
    { size: 15 },
  );

  const items = [
    ["教材・目標", "何をどこまで学ぶかはあるが、粒度が大きい", 98, 292, C.blue2],
    ["予定・期限", "日付は決めても、タスク別の予定工数が弱い", 378, 246, C.white],
    ["実績・進捗", "学習時間と進捗率が後から突き合わせにくい", 660, 292, C.white],
    ["疑問・回答", "調べた内容がタスクや履歴から切り離される", 930, 246, C.amber2],
  ];
  items.forEach(([label, sub, x, y, fill]) => {
    node(slide, ctx, label, sub, x, y, 210, 120, { fill, stroke: C.line });
  });
  arrow(slide, ctx, 306, 352, 370, 318, C.line, 2);
  arrow(slide, ctx, 586, 306, 652, 350, C.line, 2);
  arrow(slide, ctx, 868, 352, 922, 316, C.line, 2);

  rect(slide, ctx, 298, 508, 680, 72, C.navy);
  text(slide, ctx, "必要なのは、学習行動をプロジェクト管理の観点で束ねる共通面", 330, 529, 620, 28, {
    size: 18,
    color: C.white,
    bold: true,
    align: "center",
  });
  body(slide, ctx, "WBS、予定工数、実績工数、進捗率、EVM、質問管理を同じ学習プロジェクトに接続する。", 330, 558, 620, 22, {
    size: 11.5,
    color: "#CBD5E1",
  });

  footer(slide, ctx, 2, "Source: requirements.md background and app objectives");
  return slide;
}
