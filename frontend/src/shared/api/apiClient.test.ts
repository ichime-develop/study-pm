// 401が並行発生したときrefreshを1回だけ実行し、再試行へ共有することを検証する。
import { afterEach, describe, expect, it, vi } from "vitest";

import { accessTokenStore } from "./accessTokenStore";
import { apiClient } from "./apiClient";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("apiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    accessTokenStore.set(null);
  });

  it("同時401時のrefreshをsingle-flightにする", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ code: "UNAUTHORIZED", message: "認証が必要です。", details: [] }, 401))
      .mockResolvedValueOnce(jsonResponse({ code: "UNAUTHORIZED", message: "認証が必要です。", details: [] }, 401))
      .mockResolvedValueOnce(jsonResponse({ accessToken: "new-token" }))
      .mockResolvedValueOnce(jsonResponse({ value: "first" }))
      .mockResolvedValueOnce(jsonResponse({ value: "second" }));

    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      apiClient.request<{ value: string }>("/api/projects"),
      apiClient.request<{ value: string }>("/api/me/study-summary"),
    ]);

    expect(first.value).toBe("first");
    expect(second.value).toBe("second");
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/api/auth/refresh"))).toHaveLength(1);
  });

  it("retry後も401ならrefreshを繰り返さない", async () => {
    accessTokenStore.set("expired-token");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ code: "UNAUTHORIZED", message: "認証が必要です。", details: [] }, 401))
      .mockResolvedValueOnce(jsonResponse({ accessToken: "new-token" }))
      .mockResolvedValueOnce(jsonResponse({ code: "UNAUTHORIZED", message: "認証が必要です。", details: [] }, 401));

    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient.request<{ value: string }>("/api/projects")).rejects.toMatchObject({
      status: 401,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/api/auth/refresh"))).toHaveLength(1);
  });

  it("refresh失敗時はaccess tokenを破棄して元リクエストの401を返す", async () => {
    accessTokenStore.set("expired-token");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ code: "UNAUTHORIZED", message: "認証が必要です。", details: [] }, 401))
      .mockResolvedValueOnce(jsonResponse({ code: "INVALID_REFRESH_TOKEN", message: "再ログインしてください。", details: [] }, 400));

    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient.request<{ value: string }>("/api/projects")).rejects.toMatchObject({
      status: 401,
    });

    expect(accessTokenStore.get()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
