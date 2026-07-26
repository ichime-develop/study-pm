// WB01の空状態、親/LEAFタスク作成、入力検証、404表示をユーザー操作で検証する。
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import type { WbsTask } from "../features/wbs/wbsTypes";
import { WbsPage } from "./WB01_WbsPage";

describe("WbsPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("空のWBSから親タスクを作成し、一覧を再取得する", async () => {
    const fetchMock = fetchForWbsPage({ initialTasks: [] });
    vi.stubGlobal("fetch", fetchMock);

    renderWbsPage();

    expect(await screen.findByText("WBSタスクがありません")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "WBS" })).toHaveClass("active");
    await userEvent.click(screen.getByRole("button", { name: "最初の親タスクを追加" }));
    await userEvent.type(screen.getByLabelText(/親タスク名/), "第1章");
    await userEvent.click(screen.getByRole("button", { name: /^追加$/ }));

    await waitFor(() => {
      expect(screen.getByText("第1章", { selector: "strong" })).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/projects/project-id/wbs-tasks",
      expect.objectContaining({
        body: JSON.stringify({
          taskType: "PARENT",
          name: "第1章",
          description: null,
          parentTaskId: null,
          plannedStartDate: null,
          plannedEndDate: null,
          plannedHours: null,
        }),
        method: "POST",
      }),
    );
  });

  it("LEAFタスク作成で親タスクを選択し、計画値を送信する", async () => {
    const fetchMock = fetchForWbsPage({ initialTasks: [parentTask()] });
    vi.stubGlobal("fetch", fetchMock);

    renderWbsPage();

    await screen.findByText("第1章", { selector: "strong" });
    await userEvent.click(screen.getByRole("button", { name: "タスクを追加" }));
    await userEvent.type(screen.getByLabelText(/タスク名/), "問題を解く");
    await userEvent.selectOptions(screen.getByLabelText(/親タスク/), "parent-id");
    fireEvent.change(screen.getByLabelText("予定開始日（任意）"), { target: { value: "2026-07-01" } });
    fireEvent.change(screen.getByLabelText("予定終了日（任意）"), { target: { value: "2026-07-03" } });
    await userEvent.type(screen.getByLabelText(/予定工数/), "2.5");
    await userEvent.click(screen.getByRole("button", { name: /^追加$/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/projects/project-id/wbs-tasks",
        expect.objectContaining({
          body: JSON.stringify({
            taskType: "LEAF",
            name: "問題を解く",
            description: null,
            parentTaskId: "parent-id",
            plannedStartDate: "2026-07-01",
            plannedEndDate: "2026-07-03",
            plannedHours: 2.5,
          }),
          method: "POST",
        }),
      );
    });
  });

  it("0.25時間刻みではない予定工数を送信前に拒否する", async () => {
    const fetchMock = fetchForWbsPage({ initialTasks: [] });
    vi.stubGlobal("fetch", fetchMock);

    renderWbsPage();

    await screen.findByText("WBSタスクがありません");
    await userEvent.click(screen.getByRole("button", { name: "親なしタスクを追加" }));
    await userEvent.type(screen.getByLabelText(/タスク名/), "第1章を読む");
    await userEvent.type(screen.getByLabelText(/予定工数/), "0.3");
    await userEvent.click(screen.getByRole("button", { name: /^追加$/ }));

    expect(screen.getByText("予定工数は0.25時間以上9999.99時間以下の0.25時間刻みで入力してください。")).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(0);
  });

  it("404の場合はプロジェクト一覧への導線を表示する", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(errorBody(), 404)));

    renderWbsPage();

    expect(await screen.findByText("対象のプロジェクトは存在しません。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "プロジェクト一覧へ戻る" })).toHaveAttribute("href", "/projects");
  });
});

const renderWbsPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/projects/project-id/wbs"]}>
        <Routes>
          <Route element={<WbsPage />} path="/projects/:id/wbs" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

type WbsFetchOptions = {
  initialTasks: WbsTask[];
};

const fetchForWbsPage = ({ initialTasks }: WbsFetchOptions) => {
  let tasks = initialTasks;
  return vi.fn<typeof fetch>((input, init) => {
    const url = String(input);
    if (url.endsWith("/api/me")) {
      return Promise.resolve(jsonResponse(account()));
    }
    if (url.endsWith("/api/projects/project-id/wbs-tasks") && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as { taskType: "PARENT" | "LEAF"; name: string };
      const task = body.taskType === "PARENT" ? parentTask(body.name) : leafTask(body.name);
      tasks = [...tasks, task];
      return Promise.resolve(jsonResponse(task, 201));
    }
    if (url.endsWith("/api/projects/project-id/wbs")) {
      return Promise.resolve(jsonResponse(wbsList(tasks)));
    }
    if (url.endsWith("/api/projects/project-id")) {
      return Promise.resolve(jsonResponse(project()));
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
};

const account = () => ({ accountId: "account-id", email: "user@example.com", displayName: "ユーザー" });

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

const parentTask = (name = "第1章"): WbsTask => ({
  wbsTaskId: "parent-id",
  projectId: "project-id",
  parentTaskId: null,
  taskType: "PARENT" as const,
  name,
  description: null,
  plannedStartDate: null,
  plannedEndDate: null,
  plannedHours: null,
  progressRate: null,
  actualHours: null,
  hasStudyLogs: false,
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
});

const leafTask = (name: string): WbsTask => ({
  ...parentTask(name),
  wbsTaskId: "leaf-id",
  parentTaskId: "parent-id",
  taskType: "LEAF" as const,
  plannedStartDate: "2026-07-01",
  plannedEndDate: "2026-07-03",
  plannedHours: 2.5,
  progressRate: 0,
  actualHours: 0,
});

const wbsList = (tasks: WbsTask[]) => ({
  projectId: "project-id",
  ganttStartDate: "2026-07-01",
  ganttEndDate: "2026-08-31",
  plannedHours: 0,
  actualHours: 0,
  progressRate: null,
  hasDelay: false,
  tasks,
});

const errorBody = () => ({ code: "PROJECT_NOT_FOUND", message: "対象が見つかりません。", details: [] });

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
