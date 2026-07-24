// APIエラーを画面表示用の短い文言へ変換する。
import { isApiClientError } from "./apiTypes";

export const messageOf = (error: unknown): string => {
  if (isApiClientError(error)) {
    return error.body.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "エラーが発生しました。";
};

export const fieldMessageOf = (error: unknown, field: string): string | undefined => {
  if (!isApiClientError(error)) {
    return undefined;
  }
  return error.body.details.find((detail) => detail.field === field)?.message;
};
