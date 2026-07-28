// プロジェクト一覧の行が比較情報を表示し、概要へ遷移することを検証する。
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { ProjectCard } from "./ProjectCard";
import type { ProjectListItem } from "./projectTypes";

describe("ProjectCard", () => {
  it("比較情報を1行に表示し、選択するとプロジェクト概要へ遷移する", () => {
    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <Routes>
          <Route element={<ProjectCard project={project()} />} path="/projects" />
          <Route element={<p>プロジェクト概要</p>} path="/projects/:projectId" />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Java Silver 合格")).toBeInTheDocument();
    expect(screen.getByText("6/1 - 7/15")).toBeInTheDocument();
    expect(screen.getByText("5.25h / 69h")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Java Silver 合格の概要を開く" }));
    expect(screen.getByText("プロジェクト概要")).toBeInTheDocument();
  });
});

const project = (): ProjectListItem => ({
  actualHours: 5.25,
  createdAt: "2026-06-01T00:00:00Z",
  description: "Javaの基礎を学ぶ",
  hasDelay: false,
  name: "Java Silver 合格",
  plannedHours: 69,
  progressRate: 9.9,
  projectId: "project-id",
  startDate: "2026-06-01",
  status: "IN_PROGRESS",
  targetEndDate: "2026-07-15",
  updatedAt: "2026-06-01T00:00:00Z",
});
