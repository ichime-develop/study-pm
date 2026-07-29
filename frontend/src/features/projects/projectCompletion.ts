// WBSタスクの進捗からプロジェクトを完了にできるか判定する。
type ProjectCompletionTask = {
  progressRate: number | null;
  taskType: string;
};

export const canCompleteProject = (tasks: readonly ProjectCompletionTask[]) => {
  const leafTasks = tasks.filter((task) => task.taskType === "LEAF");
  return leafTasks.length > 0 && leafTasks.every((task) => task.progressRate === 100);
};
