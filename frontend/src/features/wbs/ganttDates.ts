// WBSガントチャートで日付のみの予定期間をタイムゾーンに依存せず計算する。
const millisecondsPerDay = 24 * 60 * 60 * 1000;

export type GanttBarPlacement = {
  isClippedAtEnd: boolean;
  isClippedAtStart: boolean;
  offsetDays: number;
  visibleDayCount: number;
};

export const ganttDayWidth = 34;

export const ganttBarPlacement = (
  ganttStartDate: string,
  ganttEndDate: string,
  taskStartDate: string,
  taskEndDate: string,
): GanttBarPlacement | null => {
  const ganttStart = utcDateValue(ganttStartDate);
  const ganttEnd = utcDateValue(ganttEndDate);
  const taskStart = utcDateValue(taskStartDate);
  const taskEnd = utcDateValue(taskEndDate);
  const visibleStart = Math.max(ganttStart, taskStart);
  const visibleEnd = Math.min(ganttEnd, taskEnd);

  if (visibleStart > visibleEnd) {
    return null;
  }

  return {
    isClippedAtEnd: taskEnd > ganttEnd,
    isClippedAtStart: taskStart < ganttStart,
    offsetDays: Math.floor((visibleStart - ganttStart) / millisecondsPerDay),
    visibleDayCount: Math.floor((visibleEnd - visibleStart) / millisecondsPerDay) + 1,
  };
};

export const ganttTimelineDates = (startDate: string, endDate: string): string[] => {
  const start = utcDateValue(startDate);
  const end = utcDateValue(endDate);
  const dayCount = Math.floor((end - start) / millisecondsPerDay) + 1;

  return Array.from({ length: dayCount }, (_, index) => formatUtcDate(start + index * millisecondsPerDay));
};

const utcDateValue = (date: string): number => {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

const formatUtcDate = (value: number): string => {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};
