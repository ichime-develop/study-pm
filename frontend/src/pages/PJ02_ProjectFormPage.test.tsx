// PJ02の作成・編集における保存、期間エラー、完了条件エラーの表示を検証する。
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ProjectFormPage } from "./PJ02_ProjectFormPage";
import { renderWithQueryClient } from "../test/renderWithQueryClient";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("ProjectFormPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("プロジェクト作成成功時にPJ03へ遷移する", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        projectId: "project-id",
        name: "Java Silver学習",
        description: "資格学習",
        startDate: "2026-07-25",
        targetEndDate: "2026-08-31",
        status: "NOT_STARTED",
        createdAt: "2026-07-25T00:00:00Z",
        updatedAt: "2026-07-25T00:00:00Z",
      }, 201),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderProjectForm("/projects/new", "/projects/new");

    await userEvent.type(screen.getByLabelText(/プロジェクト名/), "Java Silver学習");
    await userEvent.type(screen.getByLabelText("概要"), "資格学習");
    fireEvent.change(screen.getByLabelText(/開始日/), { target: { value: "2026-07-25" } });
    fireEvent.change(screen.getByLabelText(/目標終了日/), { target: { value: "2026-08-31" } });
    await userEvent.click(screen.getByRole("button", { name: "プロジェクトを作成" }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/projects/project-id");
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/projects",
      expect.objectContaining({
        body: JSON.stringify({
          name: "Java Silver学習",
          description: "資格学習",
          startDate: "2026-07-25",
          targetEndDate: "2026-08-31",
        }),
        method: "POST",
      }),
    );
  });

  it("期間逆転を送信前に表示する", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    renderProjectForm("/projects/new", "/projects/new");

    await userEvent.type(screen.getByLabelText(/プロジェクト名/), "期間確認");
    fireEvent.change(screen.getByLabelText(/開始日/), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText(/目標終了日/), { target: { value: "2026-07-31" } });
    await userEvent.click(screen.getByRole("button", { name: "プロジェクトを作成" }));

    expect(screen.getByText("開始日は目標終了日以前にしてください。")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("完了条件未達409を編集フォーム内に表示する", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(existingProject()))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            code: "PROJECT_COMPLETION_NOT_ALLOWED",
            message: "完了にするには、少なくとも1件のLEAFタスクがあり、すべて100%である必要があります。",
            details: [],
          },
          409,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderProjectForm("/projects/project-id/edit", "/projects/:id/edit");

    await screen.findByDisplayValue("Java Silver学習");
    await userEvent.selectOptions(screen.getByLabelText("状態"), "COMPLETED");
    await userEvent.click(screen.getByRole("button", { name: "変更を保存" }));

    expect(
      await screen.findByText("完了にするには、少なくとも1件のLEAFタスクがあり、すべて100%である必要があります。"),
    ).toBeInTheDocument();
  });
});

const renderProjectForm = (initialEntry: string, routePath: string) => {
  renderWithQueryClient(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<ProjectFormPage />} path={routePath} />
      </Routes>
    </MemoryRouter>,
  );
};

const existingProject = () => ({
  projectId: "project-id",
  name: "Java Silver学習",
  description: "資格学習",
  startDate: "2026-07-25",
  targetEndDate: "2026-08-31",
  status: "IN_PROGRESS",
  createdAt: "2026-07-25T00:00:00Z",
  updatedAt: "2026-07-25T00:00:00Z",
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
