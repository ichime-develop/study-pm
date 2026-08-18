// 教材目次画像の順序、HEIC変換、画像単位OCR、再試行を同一画面で管理する。
import { useRef, useState } from "react";

import { aiPlanApi } from "./aiPlanApi";
import {
  OCR_IMAGE_MAX_BYTES,
  OCR_IMAGE_MAX_COUNT,
  OCR_IMAGE_TOTAL_MAX_BYTES,
  prepareOcrImage,
} from "./prepareOcrImage";

export type OcrImageItem = {
  id: string;
  file: File;
  originalName: string;
  isConvertedFromHeic: boolean;
  status: "ready" | "reading" | "complete" | "failed";
  text: string;
  error: string;
};

type OcrImageListProps = {
  items: OcrImageItem[];
  onChange: (items: OcrImageItem[]) => void;
  onCombinedTextChange: (text: string) => void;
};

export const OcrImageList = ({ items, onChange, onCombinedTextChange }: OcrImageListProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectionError, setSelectionError] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (files === null || files.length === 0) return;
    const selected = Array.from(files);
    const nextCount = items.length + selected.length;
    const nextTotal = totalBytes(items) + selected.reduce((sum, file) => sum + file.size, 0);
    if (nextCount > OCR_IMAGE_MAX_COUNT) {
      setSelectionError("目次画像は10枚以下にしてください。");
      return;
    }
    if (nextTotal > OCR_IMAGE_TOTAL_MAX_BYTES) {
      setSelectionError("目次画像の合計サイズは50MB以下にしてください。");
      return;
    }

    setSelectionError("");
    setIsPreparing(true);
    const preparedItems: OcrImageItem[] = [];
    for (const original of selected) {
      try {
        const prepared = await prepareOcrImage(original);
        if (prepared.file.size > OCR_IMAGE_MAX_BYTES) {
          throw new Error("変換後の画像サイズが10MBを超えています。画像を縮小してください。");
        }
        const preparedTotal = totalBytes(items) + preparedItems.reduce((sum, item) => sum + item.file.size, 0) + prepared.file.size;
        if (preparedTotal > OCR_IMAGE_TOTAL_MAX_BYTES) {
          throw new Error("変換後の目次画像の合計サイズが50MBを超えています。画像を減らしてください。");
        }
        preparedItems.push({
          id: createId(),
          file: prepared.file,
          originalName: prepared.originalName,
          isConvertedFromHeic: prepared.isConvertedFromHeic,
          status: "ready",
          text: "",
          error: "",
        });
      } catch (error) {
        setSelectionError(error instanceof Error ? error.message : "画像を準備できませんでした。");
      }
    }
    onChange([...items, ...preparedItems]);
    setIsPreparing(false);
    if (inputRef.current !== null) inputRef.current.value = "";
  };

  const handleReadAll = async () => {
    let current = [...items];
    for (const item of current) {
      if (item.status === "complete") continue;
      current = replaceItem(current, item.id, { ...item, status: "reading", error: "" });
      onChange(current);
      try {
        const result = await aiPlanApi.extractOcrText(item.file);
        current = replaceItem(current, item.id, { ...item, status: "complete", text: result.text, error: "" });
      } catch (error) {
        current = replaceItem(current, item.id, {
          ...item,
          status: "failed",
          error: error instanceof Error ? error.message : "読み取りに失敗しました。",
        });
      }
      onChange(current);
      onCombinedTextChange(combinedText(current));
    }
  };

  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    onCombinedTextChange(combinedText(next));
  };

  const remove = (id: string) => {
    const next = items.filter((item) => item.id !== id);
    onChange(next);
    onCombinedTextChange(combinedText(next));
  };

  const hasReadableImages = items.some((item) => item.status !== "complete" && item.status !== "reading");

  return (
    <div className="ocr-upload">
      <div className="ocr-upload-header">
        <div>
          <strong>目次画像</strong>
          <p>HEIC・HEIFは端末内でJPEGへ変換します。最大10枚、合計50MBです。</p>
        </div>
        <span>{items.length} / 10枚・{formatMegabytes(totalBytes(items))}</span>
      </div>
      <input
        accept=".heic,.heif,image/heic,image/heif,image/jpeg,image/png,image/webp"
        aria-label="目次画像を選択"
        className="visually-hidden"
        multiple
        onChange={(event) => void handleFiles(event.target.files)}
        ref={inputRef}
        type="file"
      />
      <button className="secondary-button" disabled={isPreparing} onClick={() => inputRef.current?.click()} type="button">
        {isPreparing ? "画像を変換しています" : "画像を追加"}
      </button>
      {selectionError !== "" && <p className="field-error" role="alert">{selectionError}</p>}
      {items.length > 0 && (
        <ol className="ocr-image-list">
          {items.map((item, index) => (
            <li key={item.id}>
              <span className="ocr-image-order">{index + 1}</span>
              <div className="ocr-image-name">
                <strong>{item.originalName}</strong>
                <small>
                  {formatMegabytes(item.file.size)}
                  {item.isConvertedFromHeic && "・HEICからJPEGへ変換済み"}
                </small>
                {item.error !== "" && <small className="field-error">{item.error}</small>}
              </div>
              <span className={`ai-status-badge ${item.status}`}>{statusLabel(item.status)}</span>
              <button aria-label={`${item.originalName}を上へ移動`} className="text-button" disabled={index === 0} onClick={() => move(index, -1)} type="button">↑</button>
              <button aria-label={`${item.originalName}を下へ移動`} className="text-button" disabled={index === items.length - 1} onClick={() => move(index, 1)} type="button">↓</button>
              <button className="text-button danger-text" onClick={() => remove(item.id)} type="button">削除</button>
            </li>
          ))}
        </ol>
      )}
      {hasReadableImages && (
        <button className="primary-button" disabled={items.some((item) => item.status === "reading")} onClick={() => void handleReadAll()} type="button">
          {items.some((item) => item.status === "reading") ? "読み取っています" : `${items.length}枚の目次を読み取る`}
        </button>
      )}
    </div>
  );
};

const combinedText = (items: OcrImageItem[]): string =>
  items.filter((item) => item.status === "complete").map((item) => item.text.trim()).filter(Boolean).join("\n\n");

const replaceItem = (items: OcrImageItem[], id: string, replacement: OcrImageItem): OcrImageItem[] =>
  items.map((item) => (item.id === id ? replacement : item));

const totalBytes = (items: OcrImageItem[]): number => items.reduce((sum, item) => sum + item.file.size, 0);
const formatMegabytes = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)}MB`;
const createId = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const statusLabel = (status: OcrImageItem["status"]): string => ({
  ready: "待機中",
  reading: "処理中",
  complete: "完了",
  failed: "失敗",
})[status];
