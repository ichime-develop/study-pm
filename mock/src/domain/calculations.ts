import type { Project, StudyLog, TaskStatus, WbsTask } from "../data/mockData";
import { today } from "../data/mockData";

export type TaskSummary = {
  plannedHours: number;
  actualHours: number;
  progress: number;
  plannedStartDate: string;
  plannedEndDate: string;
  isLeaf: boolean;
  isDelayed: boolean;
  isOutOfProjectRange: boolean;
  status: TaskStatus;
};

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00+09:00`));

export const formatHours = (value: number) =>
  Number.isInteger(value) ? `${value}h` : `${value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}h`;

export const formatProgress = (value: number) => `${Math.round(value * 10) / 10}%`;

export const getStatusLabel = (status: Project["status"] | TaskStatus) => {
  switch (status) {
    case "not_started":
      return "未着手";
    case "in_progress":
      return "進行中";
    case "completed":
      return "完了";
  }
};

export const isLeafTask = (task: WbsTask, allTasks: WbsTask[]) =>
  !allTasks.some((candidate) => candidate.parentId === task.id);

const getDescendants = (taskId: string, allTasks: WbsTask[]): WbsTask[] => {
  const children = allTasks.filter((task) => task.parentId === taskId);
  return children.flatMap((child) => [child, ...getDescendants(child.id, allTasks)]);
};

export const getLeafTasks = (projectId: string, allTasks: WbsTask[]) =>
  allTasks.filter((task) => task.projectId === projectId && isLeafTask(task, allTasks));

export const getTaskLevel = (task: WbsTask, allTasks: WbsTask[]) => {
  let level = 0;
  let parentId = task.parentId;
  while (parentId) {
    const parent = allTasks.find((candidate) => candidate.id === parentId);
    if (!parent) break;
    level += 1;
    parentId = parent.parentId;
  }
  return level;
};

export const buildTaskSummary = (
  task: WbsTask,
  project: Project,
  allTasks: WbsTask[],
  logs: StudyLog[],
): TaskSummary => {
  const descendants = getDescendants(task.id, allTasks);
  const leafTasks = isLeafTask(task, allTasks)
    ? [task]
    : descendants.filter((candidate) => isLeafTask(candidate, allTasks));
  const plannedHours = leafTasks.reduce((sum, leaf) => sum + leaf.plannedHours, 0);
  const actualHours = logs
    .filter((log) => leafTasks.some((leaf) => leaf.id === log.taskId))
    .reduce((sum, log) => sum + log.hours, 0);
  const weightedProgress =
    plannedHours === 0
      ? 0
      : leafTasks.reduce((sum, leaf) => sum + leaf.plannedHours * leaf.progress, 0) / plannedHours;
  const plannedStartDate = leafTasks
    .map((leaf) => leaf.plannedStartDate)
    .sort((a, b) => a.localeCompare(b))[0] ?? task.plannedStartDate;
  const plannedEndDate = leafTasks
    .map((leaf) => leaf.plannedEndDate)
    .sort((a, b) => b.localeCompare(a))[0] ?? task.plannedEndDate;
  const progress = isLeafTask(task, allTasks) ? task.progress : weightedProgress;
  const status: TaskStatus =
    progress === 0 ? "not_started" : progress === 100 ? "completed" : "in_progress";

  return {
    plannedHours,
    actualHours,
    progress,
    plannedStartDate,
    plannedEndDate,
    isLeaf: isLeafTask(task, allTasks),
    isDelayed: plannedEndDate < today && progress < 100,
    isOutOfProjectRange:
      plannedStartDate < project.startDate || plannedEndDate > project.targetEndDate,
    status,
  };
};

export const buildProjectSummary = (
  project: Project,
  allTasks: WbsTask[],
  logs: StudyLog[],
) => {
  const leafTasks = getLeafTasks(project.id, allTasks);
  const plannedHours = leafTasks.reduce((sum, task) => sum + task.plannedHours, 0);
  const actualHours = logs
    .filter((log) => log.projectId === project.id)
    .reduce((sum, log) => sum + log.hours, 0);
  const progress =
    plannedHours === 0
      ? 0
      : leafTasks.reduce((sum, task) => sum + task.plannedHours * task.progress, 0) / plannedHours;
  const delayedCount = leafTasks.filter((task) => {
    const summary = buildTaskSummary(task, project, allTasks, logs);
    return summary.isDelayed;
  }).length;
  const outOfRangeCount = leafTasks.filter((task) => {
    const summary = buildTaskSummary(task, project, allTasks, logs);
    return summary.isOutOfProjectRange;
  }).length;

  return {
    plannedHours,
    actualHours,
    progress,
    delayedCount,
    outOfRangeCount,
  };
};

