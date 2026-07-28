// 一体型ガントテーブルが固定列、タイムライン、空状態の操作を同期して表示することを検証する。
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WbsGanttBoard } from "./WbsGanttBoard";
import type { WbsTask } from "./wbsTypes";

describe("WbsGanttBoard", () => {
  afterEach(cleanup);

  it("PARENT、LEAF、予定日未設定を固定列とタイムラインに表示する", () => {
    renderBoard({
      tasks: [parentTask(), leafTask(), { ...leafTask(), name: "予定日なし", plannedStartDate: null, wbsTaskId: "without-dates" }],
    });

    expect(screen.getByRole("columnheader", { name: "件名" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "進捗" })).toBeInTheDocument();
    expect(screen.getByLabelText("問題を解く: 2026-07-01 から 2026-07-03")).toBeInTheDocument();
    expect(screen.getByText("配下タスクで管理")).toBeInTheDocument();
    expect(screen.getByText("予定日未設定")).toBeInTheDocument();
  });

  it("空のWBSでも一体型のヘッダーと作成導線を表示する", () => {
    const onCreate = vi.fn();
    renderBoard({ onCreate, tasks: [] });

    expect(screen.getByRole("columnheader", { name: "予定(h)" })).toBeInTheDocument();
    expect(screen.getByText("WBSタスクがありません")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "最初の親タスクを追加" }));
    expect(onCreate).toHaveBeenCalledWith("PARENT");
  });

  it("タスク名選択を右サイドパネルの導線へ渡す", () => {
    const onSelect = vi.fn();
    renderBoard({ onSelect, tasks: [leafTask()] });

    fireEvent.click(screen.getByRole("button", { name: "問題を解くの詳細を開く" }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ wbsTaskId: "leaf-id" }));
  });

  it("工数・進捗列を隠した場合も件名とガントを表示する", () => {
    renderBoard({ tasks: [leafTask()] });
    fireEvent.click(screen.getByRole("button", { name: "工数・進捗を隠す" }));

    expect(screen.getByRole("columnheader", { name: "件名" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "予定(h)" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "問題を解くの進捗率" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("問題を解く: 2026-07-01 から 2026-07-03")).toBeInTheDocument();
  });
});

const renderBoard = ({
  onCreate = vi.fn(),
  onSelect = vi.fn(),
  tasks,
}: {
  onCreate?: (taskType: "PARENT" | "LEAF") => void;
  onSelect?: (task: WbsTask) => void;
  tasks: WbsTask[];
}) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <WbsGanttBoard
        endDate="2026-07-03"
        onCreate={onCreate}
        onSelect={onSelect}
        projectId="project-id"
        selectedTaskId={null}
        startDate="2026-07-01"
        tasks={tasks}
      />
    </QueryClientProvider>,
  );
};

const parentTask = (): WbsTask => ({
  actualHours: null,
  createdAt: "2026-07-01T00:00:00Z",
  description: null,
  hasStudyLogs: false,
  name: "第1章",
  parentTaskId: null,
  plannedEndDate: null,
  plannedHours: null,
  plannedStartDate: null,
  progressRate: null,
  projectId: "project-id",
  taskType: "PARENT",
  updatedAt: "2026-07-01T00:00:00Z",
  wbsTaskId: "parent-id",
});

const leafTask = (): WbsTask => ({
  ...parentTask(),
  actualHours: 0,
  name: "問題を解く",
  parentTaskId: "parent-id",
  plannedEndDate: "2026-07-03",
  plannedHours: 2.5,
  plannedStartDate: "2026-07-01",
  progressRate: 0,
  taskType: "LEAF",
  wbsTaskId: "leaf-id",
});
