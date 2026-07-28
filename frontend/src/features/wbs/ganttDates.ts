// WBSガントチャートで日付のみの予定期間をタイムゾーンに依存せず計算する。
const millisecondsPerDay = 24 * 60 * 60 * 1000;

export type GanttBarPosition = {
  isClippedAtEnd: boolean;
  isClippedAtStart: boolean;
  leftPercent: number;
  widthPercent: number;
};

export const ganttBarPosition = (
  projectStartDate: string,
  projectEndDate: string,
  taskStartDate: string,
  taskEndDate: string,
): GanttBarPosition | null => {
  const projectStart = utcDateValue(projectStartDate);
  const projectEnd = utcDateValue(projectEndDate);
  const taskStart = utcDateValue(taskStartDate);
  const taskEnd = utcDateValue(taskEndDate);
  const visibleStart = Math.max(projectStart, taskStart);
  const visibleEnd = Math.min(projectEnd, taskEnd);

  if (visibleStart > visibleEnd) {
    return null;
  }

  const projectDayCount = Math.floor((projectEnd - projectStart) / millisecondsPerDay) + 1;
  const visibleDayCount = Math.floor((visibleEnd - visibleStart) / millisecondsPerDay) + 1;

  if (projectDayCount === 1) {
    return {
      isClippedAtEnd: taskEnd > projectEnd,
      isClippedAtStart: taskStart < projectStart,
      leftPercent: 0,
      widthPercent: 100,
    };
  }

  return {
    isClippedAtEnd: taskEnd > projectEnd,
    isClippedAtStart: taskStart < projectStart,
    leftPercent: ((visibleStart - projectStart) / millisecondsPerDay / projectDayCount) * 100,
    widthPercent: (visibleDayCount / projectDayCount) * 100,
  };
};

export const ganttMinimumWidth = (startDate: string, endDate: string): number => {
  const dayCount = Math.floor((utcDateValue(endDate) - utcDateValue(startDate)) / millisecondsPerDay) + 1;
  return Math.max(720, dayCount * 24);
};

const utcDateValue = (date: string): number => {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};
