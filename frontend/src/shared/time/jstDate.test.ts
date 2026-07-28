// JST基準日がUTC日付の切り替わりに依存せず変換されることを検証する。
import { afterEach, describe, expect, it, vi } from "vitest";

import { currentJstDate } from "./jstDate";

describe("currentJstDate", () => {
  afterEach(() => vi.useRealTimers());

  it("UTCでは前日でもJSTの日付を返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T15:30:00Z"));

    expect(currentJstDate()).toBe("2026-07-02");
  });
});
