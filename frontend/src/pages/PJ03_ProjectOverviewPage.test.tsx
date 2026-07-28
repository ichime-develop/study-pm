// PJ03の概要表示、CM02状態、404、削除確認をユーザー操作として検証する。
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ProjectOverviewPage } from "./PJ03_ProjectOverviewPage";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("ProjectOverviewPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("主要指標、警告、未完了タスクとCM02を表示する", async () => {
    vi.stubGlobal("fetch", fetchForProject());

    renderProjectOverview();

    expect(await screen.findByRole("heading", { name: "Java Silver学習" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "プロジェクトについて" })).toBeInTheDocument();
    expect(screen.getByText("資格学習")).toBeInTheDocument();
    expect(screen.getByText("40%", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("10h / 6h", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("3h", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("2日", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("1件のタスクが終了予定日を過ぎています。")).toBeInTheDocument();
    expect(screen.getByText("実績工数が予定工数を超えています。")).toBeInTheDocument();
    expect(screen.getByText("遅延タスク")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "WBS" })).toHaveAttribute("href", "/projects/project-id/wbs");
    expect(screen.getByRole("link", { name: "学習記録" })).toHaveAttribute("href", "/projects/project-id/logs");
    expect(screen.getByText("進捗分析")).toHaveAttribute("aria-disabled", "true");
  });

  it("WBSタスクが0件の場合は未算出表示と学習記録タブの無効化を行う", async () => {
    vi.stubGlobal("fetch", fetchForProject({ tasks: [], overview: emptyOverview() }));

    renderProjectOverview();

    expect(await screen.findByText("WBSタスクはまだありません")).toBeInTheDocument();
    expect(screen.getByText("- / -", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("0h", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("進捗遅延、工数超過はありません。")).toBeInTheDocument();
    expect(screen.getByText("学習記録")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("link", { name: "WBSを作成する" })).toHaveAttribute("href", "/projects/project-id/wbs");
  });

  it("404の場合はプロジェクト一覧への導線を表示する", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(errorBody("PROJECT_NOT_FOUND"), 404)));

    renderProjectOverview();

    expect(await screen.findByText("対象のプロジェクトは存在しません。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "プロジェクト一覧へ戻る" })).toHaveAttribute("href", "/projects");
  });

  it("削除確認後にプロジェクトを削除してPJ01へ遷移する", async () => {
    const fetchMock = fetchForProject({ deleteResult: jsonResponse({ result: "OK" }) });
    vi.stubGlobal("fetch", fetchMock);

    renderProjectOverview();

    await screen.findByRole("heading", { name: "Java Silver学習" });
    await userEvent.click(screen.getByRole("button", { name: "削除" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("復元できません");

    await userEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === "DELETE")).toHaveLength(0);

    await userEvent.click(screen.getByRole("button", { name: "削除" }));
    await userEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/projects");
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/projects/project-id",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

const renderProjectOverview = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/projects/project-id"]}>
        <Routes>
          <Route element={<ProjectOverviewPage />} path="/projects/:id" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

type ProjectFetchOverrides = {
  deleteResult?: Response;
  overview?: object;
  tasks?: Array<{ wbsTaskId: string }>;
};

const fetchForProject = (overrides: ProjectFetchOverrides = {}) =>
  vi.fn<typeof fetch>((input, init) => {
    const url = String(input);
    if (url.endsWith("/api/me")) {
      return Promise.resolve(jsonResponse({ accountId: "account-id", email: "user@example.com", displayName: "ユーザー" }));
    }
    if (url.endsWith("/overview")) {
      return Promise.resolve(jsonResponse(overrides.overview ?? overview()));
    }
    if (url.endsWith("/wbs")) {
      return Promise.resolve(jsonResponse(wbsList(overrides.tasks)));
    }
    if (url.endsWith("/api/projects/project-id") && init?.method === "DELETE") {
      return Promise.resolve(overrides.deleteResult ?? jsonResponse({ result: "OK" }));
    }
    if (url.endsWith("/api/projects/project-id")) {
      return Promise.resolve(jsonResponse(project()));
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });

const project = () => ({
  projectId: "project-id",
  name: "Java Silver学習",
  description: "資格学習",
  startDate: "2026-07-01",
  targetEndDate: "2026-08-31",
  status: "IN_PROGRESS",
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-25T00:00:00Z",
});

const overview = () => ({
  projectId: "project-id",
  progressRate: 40,
  plannedHours: 10,
  remainingPlannedHours: 6,
  projectStudyHours: 3,
  projectContinuousStudyDays: 2,
  warnings: [
    { code: "DELAYED_TASK_EXISTS", message: "1件のタスクが終了予定日を過ぎています。" },
    { code: "EFFORT_OVERRUN", message: "実績工数が予定工数を超えています。" },
  ],
  incompleteTasks: [
    {
      wbsTaskId: "task-id",
      name: "遅延タスク",
      plannedEndDate: "2026-07-20",
      progressRate: 40,
      hasDelay: true,
    },
  ],
});

const emptyOverview = () => ({
  projectId: "project-id",
  progressRate: null,
  plannedHours: null,
  remainingPlannedHours: null,
  projectStudyHours: 0,
  projectContinuousStudyDays: 0,
  warnings: [],
  incompleteTasks: [],
});

const wbsList = (tasks = [{ wbsTaskId: "task-id" }]) => ({
  projectId: "project-id",
  ganttStartDate: "2026-07-01",
  ganttEndDate: "2026-08-31",
  plannedHours: 10,
  actualHours: 3,
  progressRate: 40,
  hasDelay: true,
  tasks,
});

const errorBody = (code: string) => ({ code, message: "対象が見つかりません。", details: [] });

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
