// WBSガントの固定列にある1タスク行と、行内の直接編集操作を表示する。
import { formatHours } from "../../shared/format/formatters";

import type { WbsTask } from "./wbsTypes";

export type WbsGanttHourEditor = {
  taskId: string;
  value: string;
};

type WbsGanttFixedRowProps = {
  hourEditor: WbsGanttHourEditor | null;
  isManagementColumnsCollapsed: boolean;
  isPending: boolean;
  isSelected: boolean;
  onHourEditorChange: (value: string) => void;
  onHourEditorClose: () => void;
  onHourEditorOpen: (task: WbsTask) => void;
  onPlannedHoursSave: (task: WbsTask) => void;
  onProgressChange: (task: WbsTask, progressRate: number) => void;
  onSelect: (task: WbsTask) => void;
  progressRate: number;
  rowError: string | undefined;
  task: WbsTask;
};

const progressRates = Array.from({ length: 11 }, (_, index) => index * 10);

export const WbsGanttFixedRow = ({
  hourEditor,
  isManagementColumnsCollapsed,
  isPending,
  isSelected,
  onHourEditorChange,
  onHourEditorClose,
  onHourEditorOpen,
  onPlannedHoursSave,
  onProgressChange,
  onSelect,
  progressRate,
  rowError,
  task,
}: WbsGanttFixedRowProps) => {
  const isParent = task.taskType === "PARENT";
  const isHourEditorOpen = hourEditor?.taskId === task.wbsTaskId;

  return (
    <div
      className={`wbs-gantt-fixed-row${isParent ? " is-parent" : ""}${isSelected ? " is-selected" : ""}`}
      role="row"
    >
      <div className="wbs-gantt-task-cell" role="cell">
        <button
          aria-label={`${task.name}の詳細を開く`}
          aria-pressed={isSelected}
          className={`wbs-gantt-task-name${task.parentTaskId === null ? "" : " is-child"}`}
          onClick={() => onSelect(task)}
          title={task.name}
          type="button"
        >
          <span aria-hidden="true">{isParent ? "▾" : "↳"}</span>
          <span>{task.name}</span>
          {isParent && <small>親タスク</small>}
        </button>
      </div>
      {!isManagementColumnsCollapsed && (
        <>
          <div className="wbs-gantt-hour-cell" role="cell">
            {isParent ? (
              <span className="wbs-gantt-muted-value">-</span>
            ) : (
              <>
                <button
                  aria-label={`${task.name}の予定工数を編集`}
                  className="wbs-gantt-hour-button"
                  disabled={isPending}
                  onClick={() => onHourEditorOpen(task)}
                  type="button"
                >
                  {formatHours(task.plannedHours)}
                </button>
                {isHourEditorOpen && (
                  <div aria-label={`${task.name}の予定工数を編集`} className="wbs-gantt-hour-popover" role="dialog">
                    <label htmlFor={`planned-hours-${task.wbsTaskId}`}>
                      予定工数
                      <div className="input-with-unit">
                        <input
                          aria-label="予定工数"
                          autoFocus
                          id={`planned-hours-${task.wbsTaskId}`}
                          inputMode="decimal"
                          max="9999.99"
                          min="0.25"
                          onChange={(event) => onHourEditorChange(event.target.value)}
                          step="0.25"
                          type="number"
                          value={hourEditor.value}
                        />
                        <span>時間</span>
                      </div>
                    </label>
                    <div className="button-row">
                      <button className="secondary-button" disabled={isPending} onClick={onHourEditorClose} type="button">
                        キャンセル
                      </button>
                      <button className="primary-button" disabled={isPending} onClick={() => onPlannedHoursSave(task)} type="button">
                        {isPending ? "保存中..." : "保存"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="wbs-gantt-hour-cell" role="cell">
            <span className={isParent ? "wbs-gantt-muted-value" : "wbs-gantt-readonly-value"}>{formatHours(task.actualHours)}</span>
          </div>
          <div className="wbs-gantt-progress-cell" role="cell">
            {isParent ? (
              <span className="wbs-gantt-muted-value">対象外</span>
            ) : (
              <select
                aria-label={`${task.name}の進捗率`}
                disabled={isPending}
                onChange={(event) => onProgressChange(task, Number(event.target.value))}
                value={progressRate}
              >
                {progressRates.map((value) => (
                  <option key={value} value={value}>
                    {value}%
                  </option>
                ))}
              </select>
            )}
          </div>
        </>
      )}
      {rowError !== undefined && rowError.length > 0 && (
        <p className="wbs-gantt-row-error" role="alert">
          {rowError}
        </p>
      )}
    </div>
  );
};
