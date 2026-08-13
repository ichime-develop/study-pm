// HEIC選択時の自動変換状態が画像一覧へ表示されることを検証する。
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OcrImageList } from "./OcrImageList";
import { renderWithQueryClient } from "../../test/renderWithQueryClient";

vi.mock("./prepareOcrImage", async () => {
  const actual = await vi.importActual<typeof import("./prepareOcrImage")>("./prepareOcrImage");
  return {
    ...actual,
    prepareOcrImage: vi.fn(async (file: File) => ({
      file: new File(["jpeg"], "Toc.jpg", { type: "image/jpeg" }),
      originalName: file.name,
      isConvertedFromHeic: true,
    })),
  };
});

describe("OcrImageList", () => {
  afterEach(cleanup);

  it("HEICからJPEGへ変換済みと表示する", async () => {
    let items: Parameters<typeof OcrImageList>[0]["items"] = [];
    const handleChange = vi.fn((next: typeof items) => {
      items = next;
      rerender(<OcrImageList items={items} onChange={handleChange} onCombinedTextChange={vi.fn()} />);
    });
    const { rerender } = renderWithQueryClient(
      <OcrImageList items={items} onChange={handleChange} onCombinedTextChange={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText("目次画像を選択"), {
      target: { files: [new File(["heic"], "Toc.HEIC", { type: "image/heic" })] },
    });

    await waitFor(() => expect(screen.getByText(/HEICからJPEGへ変換済み/)).toBeInTheDocument());
  });
});
