// HEICの拡張子・実データ判定と、OCR送信用JPEGへの変換を検証する。
import { describe, expect, it, vi } from "vitest";

import { heicTo } from "heic-to/csp";
import { isHeicImage, prepareOcrImage } from "./prepareOcrImage";

vi.mock("heic-to/csp", () => ({
  heicTo: vi.fn().mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" })),
}));

describe("prepareOcrImage", () => {
  it("拡張子をpngへ変えたHEICもシグネチャで判定する", async () => {
    const header = new Uint8Array([
      0, 0, 0, 24,
      102, 116, 121, 112,
      104, 101, 105, 99,
      0, 0, 0, 0,
    ]);
    const file = new File([header], "toc.png", { type: "image/png" });

    await expect(isHeicImage(file)).resolves.toBe(true);
  });

  it("HEICをJPEGへ変換して元ファイル名を保持する", async () => {
    const file = new File(["heic"], "Toc.HEIC", { type: "image/heic", lastModified: 100 });

    const result = await prepareOcrImage(file);

    expect(heicTo).toHaveBeenCalledWith({ blob: file, type: "image/jpeg", quality: 0.88 });
    expect(result.file.name).toBe("Toc.jpg");
    expect(result.file.type).toBe("image/jpeg");
    expect(result.originalName).toBe("Toc.HEIC");
    expect(result.isConvertedFromHeic).toBe(true);
  });

  it("JPEGは変換せずそのまま返す", async () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "toc.jpg", { type: "image/jpeg" });

    const result = await prepareOcrImage(file);

    expect(result.file).toBe(file);
    expect(result.isConvertedFromHeic).toBe(false);
  });
});
