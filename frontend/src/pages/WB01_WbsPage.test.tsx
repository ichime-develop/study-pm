// WB01の空状態、親/LEAFタスク作成、入力検証、404表示をユーザー操作で検証する。
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
      expect(screen.getByRole("button", { name: "第1章" })).toBeInTheDocument();
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

    await screen.findByRole("button", { name: "第1章" });
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

  it("LEAFタスクの基本情報更新で未変更の計画値を含めて送信する", async () => {
    const fetchMock = fetchForWbsPage({ initialTasks: [parentTask(), leafTask("問題を解く")] });
    vi.stubGlobal("fetch", fetchMock);

    renderWbsPage();

    await userEvent.click(await screen.findByRole("button", { name: "問題を解く" }));
    const nameInput = screen.getByLabelText(/^タスク名/);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "演習問題を解く");
    await userEvent.click(screen.getByRole("button", { name: "基本情報を保存" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/wbs-tasks/leaf-id",
        expect.objectContaining({
          body: JSON.stringify({
            name: "演習問題を解く",
            description: null,
            parentTaskId: "parent-id",
            plannedStartDate: "2026-07-01",
            plannedEndDate: "2026-07-03",
            plannedHours: 2.5,
          }),
          method: "PATCH",
        }),
      );
    });
  });

  it("親タスク更新では計画項目を明示的にnullで送信する", async () => {
    const fetchMock = fetchForWbsPage({ initialTasks: [parentTask()] });
    vi.stubGlobal("fetch", fetchMock);

    renderWbsPage();

    await userEvent.click(await screen.findByRole("button", { name: "第1章" }));
    const nameInput = screen.getByLabelText(/^親タスク名/);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "第2章");
    await userEvent.click(screen.getByRole("button", { name: "基本情報を保存" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/wbs-tasks/parent-id",
        expect.objectContaining({
          body: JSON.stringify({
            name: "第2章",
            description: null,
            parentTaskId: null,
            plannedStartDate: null,
            plannedEndDate: null,
            plannedHours: null,
          }),
          method: "PATCH",
        }),
      );
    });
    expect(screen.queryByLabelText("進捗率")).not.toBeInTheDocument();
  });

  it("LEAFタスクの進捗率を10%刻みで更新する", async () => {
    const fetchMock = fetchForWbsPage({ initialTasks: [parentTask(), leafTask("問題を解く")] });
    vi.stubGlobal("fetch", fetchMock);

    renderWbsPage();

    await userEvent.click(await screen.findByRole("button", { name: "問題を解く" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "進捗率" }), "60");
    await userEvent.click(screen.getByRole("button", { name: "進捗を更新" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/wbs-tasks/leaf-id/progress",
        expect.objectContaining({ body: JSON.stringify({ progressRate: 60 }), method: "PATCH" }),
      );
    });
  });

  it("LEAFタスクから学習記録を登録し、タスク詳細へ戻る", async () => {
    const fetchMock = fetchForWbsPage({ initialTasks: [parentTask(), leafTask("問題を解く")] });
    vi.stubGlobal("fetch", fetchMock);

    renderWbsPage();

    await userEvent.click(await screen.findByRole("button", { name: "問題を解く" }));
    await userEvent.click(screen.getByRole("button", { name: "学習記録を追加" }));
    expect(screen.getByDisplayValue("問題を解く")).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/学習時間/), "1.5");
    await userEvent.click(screen.getByRole("button", { name: "学習記録を登録" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/projects/project-id/study-logs",
        expect.objectContaining({
          body: expect.stringContaining('"studyHours":1.5'),
          method: "POST",
        }),
      );
    });
    expect(await screen.findByText("学習記録を登録しました。実績工数を更新しました。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "学習記録を追加" })).toBeInTheDocument();
  });

  it("親タスクには学習記録の登録導線を表示しない", async () => {
    const fetchMock = fetchForWbsPage({ initialTasks: [parentTask()] });
    vi.stubGlobal("fetch", fetchMock);

    renderWbsPage();

    await userEvent.click(await screen.findByRole("button", { name: "第1章" }));
    expect(screen.queryByRole("button", { name: "学習記録を追加" })).not.toBeInTheDocument();
  });

  it("親タスク削除の確認で配下LEAFを表示し、キャンセル時はAPIを呼ばない", async () => {
    const fetchMock = fetchForWbsPage({ initialTasks: [parentTask(), leafTask("問題を解く")] });
    vi.stubGlobal("fetch", fetchMock);

    renderWbsPage();

    await userEvent.click(await screen.findByRole("button", { name: "第1章" }));
    await userEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("問題を解く");
    await userEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === "DELETE")).toHaveLength(0);
  });

  it("LEAFタスクを削除すると一覧を再取得して表示から外す", async () => {
    const fetchMock = fetchForWbsPage({ initialTasks: [parentTask(), leafTask("問題を解く")] });
    vi.stubGlobal("fetch", fetchMock);

    renderWbsPage();

    await userEvent.click(await screen.findByRole("button", { name: "問題を解く" }));
    await userEvent.click(screen.getByRole("button", { name: "削除" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "問題を解く" })).not.toBeInTheDocument();
    });
  });

  it("学習記録があるLEAFの削除拒否をモーダル内に表示する", async () => {
    const fetchMock = fetchForWbsPage({
      deleteError: errorBody("TASK_HAS_STUDY_LOGS", "学習記録があるタスクは削除できません。"),
      initialTasks: [parentTask(), leafTask("問題を解く")],
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWbsPage();

    await userEvent.click(await screen.findByRole("button", { name: "問題を解く" }));
    await userEvent.click(screen.getByRole("button", { name: "削除" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "削除する" }));

    expect(await screen.findByText("学習記録があるタスクは削除できません。")).toBeInTheDocument();
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
  deleteError?: ReturnType<typeof errorBody>;
  initialTasks: WbsTask[];
};

const fetchForWbsPage = ({ deleteError, initialTasks }: WbsFetchOptions) => {
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
    if (url.endsWith("/api/projects/project-id/study-logs") && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as { studyHours: number; wbsTaskId: string };
      tasks = tasks.map((task) =>
        task.wbsTaskId === body.wbsTaskId
          ? { ...task, actualHours: (task.actualHours ?? 0) + body.studyHours, hasStudyLogs: true }
          : task,
      );
      return Promise.resolve(
        jsonResponse(
          {
            studyLog: {
              studyLogId: "study-log-id",
              projectId: "project-id",
              wbsTaskId: body.wbsTaskId,
              wbsTaskName: "問題を解く",
              studyDate: "2026-07-01",
              studyHours: body.studyHours,
              memo: null,
              createdAt: "2026-07-01T00:00:00Z",
              updatedAt: "2026-07-01T00:00:00Z",
            },
            summary: {
              projectId: "project-id",
              projectActualHours: body.studyHours,
              wbsTaskId: body.wbsTaskId,
              wbsTaskActualHours: body.studyHours,
              previousWbsTaskId: null,
              previousWbsTaskActualHours: null,
            },
          },
          201,
        ),
      );
    }
    if (url.endsWith("/progress") && init?.method === "PATCH") {
      const taskId = url.split("/").at(-2);
      const body = JSON.parse(String(init.body)) as { progressRate: number };
      tasks = tasks.map((task) => (task.wbsTaskId === taskId ? { ...task, progressRate: body.progressRate } : task));
      const task = tasks.find((candidate) => candidate.wbsTaskId === taskId);
      if (task === undefined) {
        return Promise.resolve(jsonResponse(errorBody("WBS_TASK_NOT_FOUND", "対象のWBSタスクが見つかりません。"), 404));
      }
      return Promise.resolve(jsonResponse({ task, historyAdded: true }));
    }
    if (url.includes("/api/wbs-tasks/") && init?.method === "PATCH") {
      const taskId = url.split("/").at(-1);
      const body = JSON.parse(String(init.body)) as Omit<WbsTask, "wbsTaskId" | "projectId" | "taskType" | "progressRate" | "actualHours" | "hasStudyLogs" | "createdAt" | "updatedAt">;
      tasks = tasks.map((task) => (task.wbsTaskId === taskId ? { ...task, ...body } : task));
      const task = tasks.find((candidate) => candidate.wbsTaskId === taskId);
      if (task === undefined) {
        return Promise.resolve(jsonResponse(errorBody("WBS_TASK_NOT_FOUND", "対象のWBSタスクが見つかりません。"), 404));
      }
      return Promise.resolve(jsonResponse(task));
    }
    if (url.includes("/api/wbs-tasks/") && init?.method === "DELETE") {
      if (deleteError !== undefined) {
        return Promise.resolve(jsonResponse(deleteError, 409));
      }
      const taskId = url.split("/").at(-1);
      const deletedTask = tasks.find((task) => task.wbsTaskId === taskId);
      tasks = tasks.filter((task) => task.wbsTaskId !== taskId && task.parentTaskId !== deletedTask?.wbsTaskId);
      return Promise.resolve(jsonResponse({ result: "OK" }));
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

const errorBody = (code = "PROJECT_NOT_FOUND", message = "対象が見つかりません。") => ({ code, message, details: [] });

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
