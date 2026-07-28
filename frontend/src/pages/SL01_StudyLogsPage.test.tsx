// SL01の一覧、登録、編集、削除とLEAFタスクがない状態をユーザー操作で検証する。
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import type { WbsTask } from "../features/wbs/wbsTypes";
import { StudyLogsPage } from "./SL01_StudyLogsPage";

describe("StudyLogsPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("学習記録を一覧表示し、タスクで絞り込んだ合計を表示する", async () => {
    const fetchMock = fetchForStudyLogs({ initialStudyLogs: [studyLog()] });
    vi.stubGlobal("fetch", fetchMock);

    renderStudyLogsPage();

    expect(await screen.findByRole("button", { name: "2026-07-20 Javaを読むの学習記録を編集" })).toBeInTheDocument();
    expect(screen.getByText("プロジェクト合計学習時間:")).toBeInTheDocument();
    expect(screen.getByText("1.5h", { selector: "strong" })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("対象タスク"), "leaf-id");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/projects/project-id/study-logs?page=0&size=20&taskId=leaf-id",
        expect.anything(),
      );
    });
    expect(screen.getByText("絞り込み中の合計学習時間:")).toBeInTheDocument();
  });

  it("登録前に不正な学習時間を拒否し、有効な入力は登録APIへ送る", async () => {
    const fetchMock = fetchForStudyLogs({ initialStudyLogs: [] });
    vi.stubGlobal("fetch", fetchMock);

    renderStudyLogsPage();

    await screen.findByRole("button", { name: "学習記録を追加" });
    await userEvent.click(screen.getByRole("button", { name: "学習記録を追加" }));
    const createPanel = screen.getByRole("complementary", { name: "学習記録を追加" });
    await userEvent.selectOptions(within(createPanel).getByLabelText(/^対象タスク/), "leaf-id");
    const hoursInput = within(createPanel).getByLabelText(/^学習時間/);
    await userEvent.clear(hoursInput);
    await userEvent.type(hoursInput, "0.3");
    await userEvent.click(screen.getByRole("button", { name: "学習記録を登録" }));

    expect(screen.getByText("学習時間は0.25時間以上9999.99時間以下の0.25時間刻みで入力してください。")).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(0);

    await userEvent.clear(hoursInput);
    await userEvent.type(hoursInput, "1.5");
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
  });

  it("一覧データを編集フォームへ渡し、詳細取得なしで更新する", async () => {
    const fetchMock = fetchForStudyLogs({ initialStudyLogs: [studyLog()] });
    vi.stubGlobal("fetch", fetchMock);

    renderStudyLogsPage();

    await userEvent.click(await screen.findByRole("button", { name: "2026-07-20 Javaを読むの学習記録を編集" }));
    const hoursInput = screen.getByLabelText(/^学習時間/);
    await userEvent.clear(hoursInput);
    await userEvent.type(hoursInput, "2.25");
    await userEvent.click(screen.getByRole("button", { name: "変更を保存" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/study-logs/study-log-id",
        expect.objectContaining({
          body: expect.stringContaining('"studyHours":2.25'),
          method: "PATCH",
        }),
      );
    });
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith("/api/study-logs/study-log-id"))).toBe(true);
    expect(fetchMock.mock.calls.filter(([input, options]) => String(input).endsWith("/api/study-logs/study-log-id") && options?.method === undefined)).toHaveLength(0);
  });

  it("削除確認後に学習記録を削除し、一覧を再取得する", async () => {
    const fetchMock = fetchForStudyLogs({ initialStudyLogs: [studyLog()] });
    vi.stubGlobal("fetch", fetchMock);

    renderStudyLogsPage();

    await userEvent.click(await screen.findByRole("button", { name: "2026-07-20 Javaを読むの学習記録を編集" }));
    await userEvent.click(screen.getByRole("button", { name: "削除" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("復元できません");
    await userEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/study-logs/study-log-id",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
    expect(await screen.findByText("学習記録を削除しました。実績工数を更新しました。")).toBeInTheDocument();
    expect(screen.getByText("条件に一致する学習記録はありません。")).toBeInTheDocument();
  });

  it("LEAFタスクがない場合は通常の学習記録タブでWBSへの導線を表示する", async () => {
    vi.stubGlobal("fetch", fetchForStudyLogs({ initialTasks: [parentTask()], initialStudyLogs: [] }));

    renderStudyLogsPage();

    expect(await screen.findByText("学習記録を登録するには、WBSにLEAFタスクを追加してください。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "WBSを編集する" })).toHaveAttribute("href", "/projects/project-id/wbs");
    expect(screen.queryByRole("button", { name: "学習記録を追加" })).not.toBeInTheDocument();
  });
});

const renderStudyLogsPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/projects/project-id/logs"]}>
        <Routes>
          <Route element={<StudyLogsPage />} path="/projects/:id/logs" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

type StudyLogFetchOptions = {
  initialStudyLogs: ReturnType<typeof studyLog>[];
  initialTasks?: WbsTask[];
};

const fetchForStudyLogs = ({ initialStudyLogs, initialTasks = [leafTask()] }: StudyLogFetchOptions) => {
  let studyLogs = initialStudyLogs;

  return vi.fn<typeof fetch>((input, init) => {
    const url = String(input);
    if (url.endsWith("/api/me")) {
      return Promise.resolve(jsonResponse(account()));
    }
    if (url.endsWith("/api/projects/project-id/wbs")) {
      return Promise.resolve(jsonResponse(wbsList(initialTasks)));
    }
    if (url.startsWith("http://localhost:8080/api/projects/project-id/study-logs") && init?.method === "POST") {
      const request = JSON.parse(String(init.body)) as { memo: string | null; studyDate: string; studyHours: number; wbsTaskId: string };
      const createdStudyLog = studyLog({
        memo: request.memo,
        studyDate: request.studyDate,
        studyHours: request.studyHours,
        studyLogId: "created-log-id",
        wbsTaskId: request.wbsTaskId,
      });
      studyLogs = [createdStudyLog, ...studyLogs];
      return Promise.resolve(jsonResponse(mutationResponse(createdStudyLog), 201));
    }
    if (url.startsWith("http://localhost:8080/api/projects/project-id/study-logs")) {
      const taskId = new URL(url).searchParams.get("taskId");
      const filteredStudyLogs = taskId === null ? studyLogs : studyLogs.filter((studyLog) => studyLog.wbsTaskId === taskId);
      return Promise.resolve(jsonResponse(studyLogList(filteredStudyLogs)));
    }
    if (url.endsWith("/api/study-logs/study-log-id") && init?.method === "PATCH") {
      const request = JSON.parse(String(init.body)) as { memo: string | null; studyDate: string; studyHours: number; wbsTaskId: string };
      const updatedStudyLog = studyLog({ ...request, studyLogId: "study-log-id" });
      studyLogs = studyLogs.map((candidate) => (candidate.studyLogId === updatedStudyLog.studyLogId ? updatedStudyLog : candidate));
      return Promise.resolve(jsonResponse(mutationResponse(updatedStudyLog)));
    }
    if (url.endsWith("/api/study-logs/study-log-id") && init?.method === "DELETE") {
      studyLogs = studyLogs.filter((studyLog) => studyLog.studyLogId !== "study-log-id");
      return Promise.resolve(jsonResponse({ result: "OK", summary: recalculation() }));
    }
    if (url.endsWith("/api/projects/project-id")) {
      return Promise.resolve(jsonResponse(project()));
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
};

const account = () => ({ accountId: "account-id", displayName: "ユーザー", email: "user@example.com" });

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

const parentTask = (): WbsTask => ({
  wbsTaskId: "parent-id",
  projectId: "project-id",
  parentTaskId: null,
  taskType: "PARENT",
  name: "第1章",
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

const leafTask = (): WbsTask => ({
  ...parentTask(),
  wbsTaskId: "leaf-id",
  parentTaskId: "parent-id",
  taskType: "LEAF",
  name: "Javaを読む",
  plannedStartDate: "2026-07-01",
  plannedEndDate: "2026-07-03",
  plannedHours: 2,
  progressRate: 0,
  actualHours: 0,
});

const wbsList = (tasks: WbsTask[]) => ({
  projectId: "project-id",
  ganttStartDate: "2026-07-01",
  ganttEndDate: "2026-08-31",
  plannedHours: 2,
  actualHours: 0,
  progressRate: 0,
  hasDelay: false,
  tasks,
});

const studyLog = (overrides: Partial<{
  memo: string | null;
  studyDate: string;
  studyHours: number;
  studyLogId: string;
  wbsTaskId: string;
}> = {}) => ({
  studyLogId: overrides.studyLogId ?? "study-log-id",
  projectId: "project-id",
  wbsTaskId: overrides.wbsTaskId ?? "leaf-id",
  wbsTaskName: "Javaを読む",
  studyDate: overrides.studyDate ?? "2026-07-20",
  studyHours: overrides.studyHours ?? 1.5,
  memo: overrides.memo ?? "メモ",
  createdAt: "2026-07-20T00:00:00Z",
  updatedAt: "2026-07-20T00:00:00Z",
});

const recalculation = () => ({
  projectId: "project-id",
  projectActualHours: 1.5,
  wbsTaskId: "leaf-id",
  wbsTaskActualHours: 1.5,
  previousWbsTaskId: null,
  previousWbsTaskActualHours: null,
});

const mutationResponse = (createdStudyLog: ReturnType<typeof studyLog>) => ({ studyLog: createdStudyLog, summary: recalculation() });

const studyLogList = (studyLogs: ReturnType<typeof studyLog>[]) => ({
  studyLogs,
  totalStudyHours: studyLogs.reduce((total, studyLog) => total + studyLog.studyHours, 0),
  page: { page: 0, size: 20, totalElements: studyLogs.length, totalPages: 1 },
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
