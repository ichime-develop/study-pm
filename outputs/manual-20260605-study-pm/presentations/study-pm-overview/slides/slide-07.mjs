import { C, arrow, bg, body, footer, kicker, node, rect, text, title } from "./theme.mjs";

export async function slide07(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx);
  kicker(slide, ctx, "platform direction");
  title(slide, ctx, "PCモックは、共通APIと将来のFlutter版へ進むための検証層。", {
    w: 990,
    h: 64,
    size: 33,
  });
  body(slide, ctx, "このリポジトリはPC Web版、共通設計、将来のFlutterスマホアプリ向けAPI仕様を扱う前提。モバイルは別リポジトリ想定。", 58, 166, 920, 40, {
    size: 14.5,
  });

  node(slide, ctx, "React PC Web Mock", "15画面 / 固定データ / 導線確認", 90, 300, 230, 112, { fill: C.blue2, stroke: C.blue });
  node(slide, ctx, "Behavior Contract", "業務ルール / 集計 / 入力制約 / 画面確認観点", 400, 266, 250, 180, { fill: C.white });
  node(slide, ctx, "Shared Backend API", "同一アカウント / 同一データ / PC・モバイル共通", 732, 300, 238, 112, { fill: C.white });
  node(slide, ctx, "Flutter Mobile", "カードUI / 今日のタスク / カメラOCR", 1032, 300, 180, 112, { fill: C.green2, stroke: C.green });
  arrow(slide, ctx, 320, 356, 400, 356, C.blue, 3);
  arrow(slide, ctx, 650, 356, 732, 356, C.blue, 3);
  arrow(slide, ctx, 970, 356, 1032, 356, C.green, 3);

  rect(slide, ctx, 400, 488, 570, 54, C.navy);
  text(slide, ctx, "AI/OCRは後段で接続: 送信情報選択、同意、生成結果確認を先に画面で固める。", 428, 506, 514, 18, {
    size: 13.5,
    color: C.white,
    bold: true,
    align: "center",
  });
  footer(slide, ctx, 7, "Source: requirements.md utilization assumptions, ui-mock mobile relationship");
  return slide;
}
