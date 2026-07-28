// 日単位ガント表示のUTC日付計算、1日期間、期間外クリップを検証する。
import { describe, expect, it } from "vitest";

import { ganttBarPlacement, ganttDayWidth, ganttTimelineDates } from "./ganttDates";

describe("ganttDates", () => {
  it("UTC日付で日単位の配置と期間外クリップを計算する", () => {
    expect(ganttBarPlacement("2026-07-01", "2026-07-03", "2026-06-30", "2026-07-02")).toEqual({
      isClippedAtEnd: false,
      isClippedAtStart: true,
      offsetDays: 0,
      visibleDayCount: 2,
    });
    expect(ganttTimelineDates("2026-07-01", "2026-07-03")).toEqual(["2026-07-01", "2026-07-02", "2026-07-03"]);
    expect(ganttDayWidth).toBe(34);
  });

  it("1日表示期間でも予定バーを配置する", () => {
    expect(ganttBarPlacement("2026-07-01", "2026-07-01", "2026-07-01", "2026-07-03")).toEqual({
      isClippedAtEnd: true,
      isClippedAtStart: false,
      offsetDays: 0,
      visibleDayCount: 1,
    });
  });

  it("表示期間と重ならない予定は配置しない", () => {
    expect(ganttBarPlacement("2026-07-01", "2026-07-03", "2026-07-04", "2026-07-05")).toBeNull();
  });
});
