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

  it("FormDataはContent-Typeを上書きせず送信する", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ text: "目次", detectedPageCount: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const body = new FormData();
    body.append("image", new File(["image"], "toc.jpg", { type: "image/jpeg" }));

    await apiClient.request("/api/ai-plan/ocr", { method: "POST", body });

    const options = fetchMock.mock.calls[0][1];
    expect(options?.body).toBe(body);
    expect(new Headers(options?.headers).has("Content-Type")).toBe(false);
  });

  it("HTTP応答を受け取れない場合は通信エラーとして案内する", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(apiClient.request("/api/projects")).rejects.toMatchObject({
      status: 0,
      body: {
        code: "NETWORK_ERROR",
        message: "サーバーに接続できませんでした。接続状態を確認して再度お試しください。",
      },
    });
  });
});
