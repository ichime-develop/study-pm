// AI01〜AI03の主要導線として、方法選択、生成開始、下書き変換を検証する。
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AiPlanDraftPage } from "./AI03_AiPlanDraftPage";
import { AiPlanInputPage } from "./AI02_AiPlanInputPage";
import { AiPlanMethodPage } from "./AI01_AiPlanMethodPage";
import type { AiGenerationJob } from "../features/aiPlan/aiPlanTypes";
import { renderWithQueryClient } from "../test/renderWithQueryClient";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("AI計画作成画面", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("AI01は概要から作成を既定選択し、選択した方法でAI02へ進む", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(account())));

    renderPage(<AiPlanMethodPage />, "/projects/new/ai", "/projects/new/ai");

    expect(await screen.findByRole("radio", { name: /概要から作成/ })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("radio", { name: /目次から作成/ }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    expect(navigateMock).toHaveBeenCalledWith("/projects/new/ai/input?method=toc");
  });

  it("AI02は入力を保存して生成ジョブを開始する", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/api/me")) return jsonResponse(account());
      if (url.endsWith("/api/ai-plan/requests") && init?.method === "POST") {
        return jsonResponse({
          ...requestPayload(),
          generationRequestId: "request-1",
        }, 201);
      }
      if (url.endsWith("/api/ai-plan/requests/request-1/draft-jobs")) {
        return jsonResponse({
          jobId: "job-1",
          jobType: "WBS_DRAFT_GENERATION",
          status: "QUEUED",
          acceptedAt: "2026-08-05T00:00:00Z",
          deadlineAt: "2026-08-05T00:05:00Z",
          error: null,
          draftId: null,
        }, 202);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage(<AiPlanInputPage />, "/projects/new/ai/input?method=overview", "/projects/new/ai/input");

    await screen.findByRole("heading", { name: "概要から計画案を作る" });
    await userEvent.type(screen.getByLabelText(/^学習目標 必須$/), "Java Silverに合格する");
    fireEvent.change(screen.getByLabelText(/学習開始日/), { target: { value: "2026-08-05" } });
    fireEvent.change(screen.getByLabelText(/目標終了日/), { target: { value: "2026-09-30" } });
    await userEvent.type(screen.getByLabelText(/学習内容の概要/), "Java SE 17の文法と問題演習を学ぶ。");
    await userEvent.click(screen.getByRole("button", { name: "WBS下書きを生成" }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        "/projects/new/ai/requests/request-1?method=overview&jobId=job-1",
        { replace: true },
      );
    });
    const requestCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/api/ai-plan/requests"));
    expect(JSON.parse(String(requestCall?.[1]?.body))).toMatchObject({
      learningGoal: "Java Silverに合格する",
      sourceType: "OVERVIEW",
      sources: [{ sourceType: "OVERVIEW", textContent: "Java SE 17の文法と問題演習を学ぶ。" }],
    });
  });

  it("AI02はAI利用不可を案内し、確認後にプロジェクト一覧へ戻る", async () => {
    vi.stubGlobal("fetch", requestAndJobFetch({
      ...generationJob(),
      status: "FAILED",
      error: {
        code: "AI_GENERATION_UNAVAILABLE",
        message: "AIは現在利用できません。",
        actionHints: ["WBSを手動で作成してください。"],
      },
    }));

    renderPage(
      <AiPlanInputPage />,
      "/projects/new/ai/requests/request-1?method=overview&jobId=job-1",
      "/projects/new/ai/requests/:requestId",
    );

    expect(await screen.findByRole("dialog", { name: "AI機能を利用できません" })).toBeInTheDocument();
    expect(screen.getByText("WBSを手動で作成してください。")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(navigateMock).toHaveBeenCalledWith("/projects");
  });

  it("AI02は生成完了を検出してAI03へ進む", async () => {
    vi.stubGlobal("fetch", requestAndJobFetch({
      ...generationJob(),
      status: "COMPLETED",
      draftId: "draft-1",
    }));

    renderPage(
      <AiPlanInputPage />,
      "/projects/new/ai/requests/request-1?method=overview&jobId=job-1",
      "/projects/new/ai/requests/:requestId",
    );

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        "/projects/new/ai/drafts/draft-1?requestId=request-1",
        { replace: true },
      );
    });
  });

  it("AI03は検証済み下書きを通常プロジェクトへ変換する", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/api/me")) return jsonResponse(account());
      if (url.endsWith("/api/ai-plan/drafts/draft-1") && (init?.method ?? "GET") === "GET") {
        return jsonResponse(draft());
      }
      if (url.endsWith("/api/ai-plan/drafts/draft-1/convert") && init?.method === "POST") {
        return jsonResponse({ projectId: "project-1", wbsTaskIds: ["parent-1", "leaf-1"] }, 201);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage(<AiPlanDraftPage />, "/projects/new/ai/drafts/draft-1", "/projects/new/ai/drafts/:draftId");

    expect(await screen.findByText("Javaの基本")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "この計画でプロジェクトを作成" }));

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/projects/project-1/wbs"));
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/ai-plan/drafts/draft-1/convert",
      expect.objectContaining({ body: JSON.stringify({ draftRevision: 1 }), method: "POST" }),
    );
  });
});

const renderPage = (element: ReactElement, initialEntry: string, routePath: string) => {
  renderWithQueryClient(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes><Route element={element} path={routePath} /></Routes>
    </MemoryRouter>,
  );
};

const account = () => ({ accountId: "account-1", email: "user@example.com", displayName: "学習者" });

const generationJob = (): AiGenerationJob => ({
  jobId: "job-1",
  jobType: "WBS_DRAFT_GENERATION",
  status: "PROCESSING",
  acceptedAt: "2026-08-05T00:00:00Z",
  deadlineAt: "2026-08-05T00:05:00Z",
  error: null,
  draftId: null,
});

const requestAndJobFetch = (job: AiGenerationJob) => vi.fn<typeof fetch>(async (input) => {
  const url = String(input);
  if (url.endsWith("/api/me")) return jsonResponse(account());
  if (url.endsWith("/api/ai-plan/requests/request-1")) {
    return jsonResponse({ ...requestPayload(), generationRequestId: "request-1" });
  }
  if (url.endsWith("/api/ai-plan/jobs/job-1")) return jsonResponse(job);
  throw new Error(`Unexpected request: ${url}`);
});

const requestPayload = () => ({
  sourceType: "OVERVIEW",
  learningGoal: "Java Silverに合格する",
  startDate: "2026-08-05",
  targetEndDate: "2026-09-30",
  constraints: {
    weekdayAvailableHours: 1,
    weekendAvailableHours: 2,
    unavailableWeekdays: [],
    scheduleNotes: "",
    focusText: "",
    lightText: "",
    excludeText: "",
    wbsSplitUnit: "SECTION",
  },
  sources: [{
    temporaryKey: "source-overview-1",
    sourceType: "OVERVIEW",
    sourceOrder: 0,
    label: "学習内容の概要",
    textContent: "Java SE 17の文法と問題演習を学ぶ。",
  }],
});

const draft = () => ({
  draftId: "draft-1",
  draftRevision: 1,
  project: {
    name: "Java Silver合格",
    description: "Java SE 17を学ぶ。",
    startDate: "2026-08-05",
    targetEndDate: "2026-09-30",
  },
  tasks: [
    {
      temporaryKey: "parent-1",
      taskType: "PARENT",
      parentTemporaryKey: null,
      name: "Javaの基本",
      description: "Javaの基礎を扱う。",
      plannedStartDate: null,
      plannedEndDate: null,
      plannedHours: null,
      sourceTemporaryKeys: [],
    },
    {
      temporaryKey: "leaf-1",
      taskType: "LEAF",
      parentTemporaryKey: "parent-1",
      name: "文法を学ぶ",
      description: "基本文法を確認する。",
      plannedStartDate: "2026-08-05",
      plannedEndDate: "2026-08-08",
      plannedHours: 2,
      sourceTemporaryKeys: ["source-overview-1"],
    },
  ],
  validation: { status: "VALID" },
  planWarnings: [],
  relaxationOptions: [],
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
