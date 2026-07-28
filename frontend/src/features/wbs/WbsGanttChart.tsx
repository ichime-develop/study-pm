// API-WB-01の予定期間をプロジェクト期間の横軸へガントバーとして表示する。
import { ganttBarPosition, ganttMinimumWidth } from "./ganttDates";
import type { WbsTask } from "./wbsTypes";

type WbsGanttChartProps = {
  endDate: string | null;
  startDate: string | null;
  tasks: WbsTask[];
};

export const WbsGanttChart = ({ endDate, startDate, tasks }: WbsGanttChartProps) => {
  if (startDate === null || endDate === null) {
    return (
      <section className="gantt-chart" aria-labelledby="gantt-chart-title">
        <h3 id="gantt-chart-title">ガントチャート</h3>
        <p className="empty-message">プロジェクトの表示期間を取得できません。</p>
      </section>
    );
  }

  return (
    <section className="gantt-chart" aria-labelledby="gantt-chart-title">
      <div className="gantt-chart-header">
        <h3 id="gantt-chart-title">ガントチャート</h3>
        <p>
          表示期間: {startDate} - {endDate}
        </p>
      </div>
      <div className="gantt-chart-scroll">
        <div className="gantt-chart-grid" style={{ minWidth: `${ganttMinimumWidth(startDate, endDate)}px` }}>
          <div className="gantt-axis" aria-label={`ガント表示期間 ${startDate} から ${endDate}`}>
            <span>{startDate}</span>
            <span>{endDate}</span>
          </div>
          <div className="gantt-chart-rows">
            {tasks.length === 0 ? (
              <p className="gantt-empty-message">WBSタスクを追加すると、予定期間をここに表示します。</p>
            ) : (
              tasks.map((task) => (
                <GanttTaskRow endDate={endDate} key={task.wbsTaskId} startDate={startDate} task={task} />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

type GanttTaskRowProps = {
  endDate: string;
  startDate: string;
  task: WbsTask;
};

const GanttTaskRow = ({ endDate, startDate, task }: GanttTaskRowProps) => {
  if (task.taskType === "PARENT") {
    return (
      <div className="gantt-task-row gantt-parent-row">
        <strong>{task.name}</strong>
        <span>配下タスクで管理</span>
      </div>
    );
  }

  if (task.plannedStartDate === null || task.plannedEndDate === null) {
    return (
      <div className="gantt-task-row">
        <strong>{task.name}</strong>
        <span>予定日未設定</span>
      </div>
    );
  }

  const position = ganttBarPosition(startDate, endDate, task.plannedStartDate, task.plannedEndDate);
  if (position === null) {
    return (
      <div className="gantt-task-row">
        <strong>{task.name}</strong>
        <span>プロジェクト期間外</span>
      </div>
    );
  }

  const clippedLabel = [position.isClippedAtStart ? "開始日が期間外" : null, position.isClippedAtEnd ? "終了日が期間外" : null]
    .filter((label): label is string => label !== null)
    .join("、");

  return (
    <div className="gantt-task-row">
      <strong>{task.name}</strong>
      <div className="gantt-track">
        <span
          aria-label={`${task.name}: ${task.plannedStartDate} から ${task.plannedEndDate}${clippedLabel.length > 0 ? `、${clippedLabel}` : ""}`}
          className={`gantt-bar${position.isClippedAtStart ? " is-clipped-start" : ""}${position.isClippedAtEnd ? " is-clipped-end" : ""}`}
          style={{ left: `${position.leftPercent}%`, width: `${position.widthPercent}%` }}
        />
      </div>
    </div>
  );
};
