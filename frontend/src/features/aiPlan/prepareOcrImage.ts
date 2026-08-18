// OCR送信前にHEIC/HEIFをブラウザ内でJPEGへ変換し、Googleへ元画像を送らない。
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);
const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

export const OCR_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const OCR_IMAGE_TOTAL_MAX_BYTES = 50 * 1024 * 1024;
export const OCR_IMAGE_MAX_COUNT = 10;

export type PreparedOcrImage = {
  file: File;
  isConvertedFromHeic: boolean;
  originalName: string;
};

export const isHeicImage = async (file: File): Promise<boolean> => {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "heic" || extension === "heif" || HEIC_MIME_TYPES.has(file.type.toLowerCase())) {
    return true;
  }
  const header = new Uint8Array(await readBlob(file.slice(0, 64)));
  if (header.length < 12 || textAt(header, 4, 4) !== "ftyp") {
    return false;
  }
  for (let offset = 8; offset + 4 <= header.length; offset += 4) {
    if (HEIF_BRANDS.has(textAt(header, offset, 4))) {
      return true;
    }
  }
  return false;
};

export const prepareOcrImage = async (file: File): Promise<PreparedOcrImage> => {
  if (!(await isHeicImage(file))) {
    return { file, isConvertedFromHeic: false, originalName: file.name };
  }

  try {
    const { heicTo } = await import("heic-to/csp");
    const jpeg = await heicTo({ blob: file, type: "image/jpeg", quality: 0.88 });
    const converted = new File([jpeg], jpegNameFor(file.name), {
      lastModified: file.lastModified,
      type: "image/jpeg",
    });
    return { file: converted, isConvertedFromHeic: true, originalName: file.name };
  } catch {
    throw new Error("HEIC画像をJPEGへ変換できませんでした。別の画像を選択するか、目次を直接入力してください。");
  }
};

const jpegNameFor = (name: string): string => `${name.replace(/\.[^.]+$/, "") || "image"}.jpg`;

const textAt = (bytes: Uint8Array, offset: number, length: number): string =>
  String.fromCharCode(...bytes.slice(offset, offset + length));

const readBlob = (blob: Blob): Promise<ArrayBuffer> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("画像形式を確認できませんでした。"));
  reader.onload = () => {
    if (reader.result instanceof ArrayBuffer) {
      resolve(reader.result);
    } else {
      reject(new Error("画像形式を確認できませんでした。"));
    }
  };
  reader.readAsArrayBuffer(blob);
});
