// APIの数値・日付を画面表示用の日本語表記へ変換する。
export const formatHours = (hours: number | null | undefined): string => {
  if (hours === null || hours === undefined) {
    return "-";
  }
  return `${trimTrailingZeros(hours, 2)}h`;
};

export const formatProgressRate = (progressRate: number | null | undefined): string => {
  if (progressRate === null || progressRate === undefined) {
    return "-";
  }
  return `${trimTrailingZeros(progressRate, 1)}%`;
};

export const formatProjectStatus = (status: string): string => {
  switch (status) {
    case "NOT_STARTED":
      return "未着手";
    case "IN_PROGRESS":
      return "進行中";
    case "COMPLETED":
      return "完了";
    default:
      return status;
  }
};

const trimTrailingZeros = (value: number, maximumFractionDigits: number): string =>
  new Intl.NumberFormat("ja-JP", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
