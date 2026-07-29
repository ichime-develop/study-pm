// AN01のEVM、バーンダウン、算出不可理由とWBS導線をユーザー操作で検証する。
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { renderWithQueryClient } from "../test/renderWithQueryClient";
import { ProgressAnalysisPage } from "./AN01_ProgressAnalysisPage";

describe("ProgressAnalysisPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("EVM、バーンダウン、計画不整合を表示する", async () => {
    vi.stubGlobal("fetch", fetchForAnalysis());

    renderAnalysis();

    expect(await screen.findByRole("heading", { name: "EVM指標" })).toBeInTheDocument();
    expect(screen.getByText("20h", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "BACの説明" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /の説明$/ })).toHaveLength(8);
    expect(screen.getByText("Budget at Completion。プロジェクト全体の予定工数です。")).toBeInTheDocument();
    expect(screen.getByText("遅れ")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /バーンダウンチャート/ })).toBeInTheDocument();
    expect(screen.getByText("予定終了日がプロジェクト目標終了日より後です。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "タスクB" })).toHaveAttribute("href", "/projects/project-id/wbs");
  });

  it("予定日未設定時は全EVMをハイフン表示しWBS導線を出す", async () => {
    vi.stubGlobal("fetch", fetchForAnalysis({ isCalculable: false }));

    renderAnalysis();

    expect(await screen.findAllByText("-")).toHaveLength(8);
    expect(screen.getAllByText("予定開始日または予定終了日が未設定のタスクがあります。")).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "WBSで予定日を設定する" })).toHaveLength(2);
  });
});

const renderAnalysis = () => {
  renderWithQueryClient(
    <MemoryRouter initialEntries={["/projects/project-id/analysis"]}>
      <Routes>
        <Route element={<ProgressAnalysisPage />} path="/projects/:id/analysis" />
      </Routes>
    </MemoryRouter>,
  );
};

const fetchForAnalysis = ({ isCalculable = true }: { isCalculable?: boolean } = {}) =>
  vi.fn<typeof fetch>((input) => {
    const url = String(input);
    if (url.endsWith("/api/me")) {
      return Promise.resolve(jsonResponse({ accountId: "account-id", email: "user@example.com", displayName: "ユーザー" }));
    }
    if (url.endsWith("/analysis/evm")) {
      return Promise.resolve(jsonResponse(isCalculable ? evm() : unavailableEvm()));
    }
    if (url.endsWith("/analysis/burndown")) {
      return Promise.resolve(jsonResponse(isCalculable ? burndown() : unavailableBurndown()));
    }
    if (url.endsWith("/analysis/plan-warnings")) {
      return Promise.resolve(jsonResponse({ warnings: isCalculable ? [warning()] : [] }));
    }
    if (url.endsWith("/wbs")) {
      return Promise.resolve(jsonResponse(wbs()));
    }
    if (url.endsWith("/api/projects/project-id")) {
      return Promise.resolve(jsonResponse(project()));
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });

const jsonResponse = (body: object) =>
  new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });

const project = () => ({
  projectId: "project-id",
  name: "Java Silver学習",
  description: null,
  startDate: "2026-08-01",
  targetEndDate: "2026-08-20",
  status: "IN_PROGRESS",
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
});

const wbs = () => ({
  projectId: "project-id",
  plannedHours: 20,
  actualHours: 3,
  progressRate: 20,
  hasDelay: false,
  ganttStartDate: "2026-08-01",
  ganttEndDate: "2026-08-20",
  tasks: [],
});

const evm = () => ({
  baseDate: "2026-08-10",
  isCalculable: true,
  unavailableReasons: [],
  bac: 20,
  pv: 10,
  ev: 5,
  ac: 3,
  sv: -5,
  cv: 2,
  spi: 0.5,
  cpi: 1.666,
});

const unavailableEvm = () => ({
  baseDate: "2026-08-10",
  isCalculable: false,
  unavailableReasons: ["MISSING_SCHEDULE"],
  bac: null,
  pv: null,
  ev: null,
  ac: null,
  sv: null,
  cv: null,
  spi: null,
  cpi: null,
});

const burndown = () => ({
  baseDate: "2026-08-10",
  isCalculable: true,
  unavailableReasons: [],
  idealPoints: [
    { date: "2026-08-01", remainingHours: 20 },
    { date: "2026-08-20", remainingHours: 0 },
  ],
  actualPoints: [{ date: "2026-08-01", remainingHours: 20 }],
  idealRemainingHours: 10,
  actualRemainingHours: 15,
  workDifferenceHours: 5,
  dayDifference: 5,
});

const unavailableBurndown = () => ({
  baseDate: "2026-08-10",
  isCalculable: false,
  unavailableReasons: ["MISSING_SCHEDULE"],
  idealPoints: [],
  actualPoints: [],
  idealRemainingHours: null,
  actualRemainingHours: null,
  workDifferenceHours: null,
  dayDifference: null,
});

const warning = () => ({
  taskId: "task-b",
  taskName: "タスクB",
  type: "ENDS_AFTER_PROJECT",
  plannedStartDate: "2026-08-10",
  plannedEndDate: "2026-08-21",
  message: "予定終了日がプロジェクト目標終了日より後です。",
});
