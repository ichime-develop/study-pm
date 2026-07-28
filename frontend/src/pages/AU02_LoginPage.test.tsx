// ログイン画面が入力値を認証APIへ渡すことをユーザー操作で検証する。
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoginPage } from "./AU02_LoginPage";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("LoginPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("ログイン成功時にプロジェクト一覧へ遷移する", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          account: { accountId: "account-id", email: "user@example.com", displayName: "学習者" },
          accessToken: "access-token",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderLoginPage();

    await userEvent.type(screen.getByLabelText("メールアドレス"), "user@example.com");
    await userEvent.type(screen.getByLabelText("パスワード"), "Password1");
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/auth/login",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith("/projects", { replace: true });
  });

  it("パスワードの表示状態を切り替えられる", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const passwordInput = screen.getByLabelText("パスワード");
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "パスワードを表示" }));
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "パスワードを隠す" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "パスワードを隠す" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});

const renderLoginPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};
