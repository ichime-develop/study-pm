// JST基準日を画面横断で同じYYYY-MM-DD形式へ変換する。
export const currentJstDate = (): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Tokyo",
    year: "numeric",
  }).formatToParts();
  const partValue = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;

  return `${partValue("year")}-${partValue("month")}-${partValue("day")}`;
};
