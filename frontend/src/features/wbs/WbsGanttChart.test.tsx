// ガントチャートがAPI-WB-01の予定期間を日付軸へ正しく表示することを検証する。
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WbsGanttChart } from "./WbsGanttChart";
import type { WbsTask } from "./wbsTypes";

describe("WbsGanttChart", () => {
  it("LEAFの予定期間をバーとして表示し、親タスクと予定日未設定を区別する", () => {
    render(
      <WbsGanttChart
        endDate="2026-07-03"
        startDate="2026-07-01"
        tasks={[parentTask(), leafTask(), { ...leafTask(), wbsTaskId: "without-dates", name: "予定日なし", plannedStartDate: null }]}
      />,
    );

    expect(screen.getByLabelText("問題を解く: 2026-07-01 から 2026-07-03")).toBeInTheDocument();
    expect(screen.getByText("配下タスクで管理")).toBeInTheDocument();
    expect(screen.getByText("予定日未設定")).toBeInTheDocument();
  });

  it("1日プロジェクトでも予定バーを表示する", () => {
    render(
      <WbsGanttChart endDate="2026-07-01" startDate="2026-07-01" tasks={[leafTask()]} />,
    );

    expect(screen.getByLabelText("問題を解く: 2026-07-01 から 2026-07-03、終了日が期間外")).toBeInTheDocument();
  });
});

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
