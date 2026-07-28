// WBS一覧と日単位ガントを同じ行構造で表示し、LEAFの直接操作を提供する。
import { useRef, useState } from "react";

import { messageOf } from "../../shared/api/errorMessages";
import { currentJstDate } from "../../shared/time/jstDate";
import {
  ganttBarPlacement,
  ganttDayWidth,
  ganttTimelineDates,
} from "./ganttDates";
import { useUpdateWbsProgress, useUpdateWbsTask } from "./useWbs";
import { WbsGanttFixedRow, type WbsGanttHourEditor } from "./WbsGanttFixedRow";
import { buildWbsTaskUpdateRequest, updateFieldsForTask } from "./wbsTaskUpdateRequest";
import type { WbsTask, WbsTaskType } from "./wbsTypes";

type WbsGanttBoardProps = {
  endDate: string | null;
  onCreate: (taskType: WbsTaskType) => void;
  onSelect: (task: WbsTask) => void;
  projectId: string;
  selectedTaskId: string | null;
  startDate: string | null;
  tasks: WbsTask[];
};

export const WbsGanttBoard = ({
  endDate,
  onCreate,
  onSelect,
  projectId,
  selectedTaskId,
  startDate,
  tasks,
}: WbsGanttBoardProps) => {
  const updateWbsTask = useUpdateWbsTask(projectId);
  const updateWbsProgress = useUpdateWbsProgress(projectId);
  const [hourEditor, setHourEditor] = useState<WbsGanttHourEditor | null>(null);
  const [isManagementColumnsCollapsed, setIsManagementColumnsCollapsed] = useState(false);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [pendingProgressRates, setPendingProgressRates] = useState<Record<string, number>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const timelineHeaderPaneRef = useRef<HTMLDivElement>(null);
  const timelineDates = startDate === null || endDate === null ? [] : ganttTimelineDates(startDate, endDate);
  const isTimelineAvailable = timelineDates.length > 0;
  const timelineWidth = timelineDates.length * ganttDayWidth;
  const today = currentJstDate();

  const updatePendingState = (taskId: string, isPending: boolean) => {
    setPendingTaskIds((current) => {
      const next = new Set(current);
      if (isPending) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
      return next;
    });
  };

  const handlePlannedHoursSave = async (task: WbsTask) => {
    if (hourEditor?.taskId !== task.wbsTaskId) {
      return;
    }
    const result = buildWbsTaskUpdateRequest({
      ...updateFieldsForTask(task),
      plannedHours: hourEditor.value,
    });
    if (result.error !== undefined) {
      setRowErrors((current) => ({ ...current, [task.wbsTaskId]: result.error }));
      return;
    }

    setRowErrors((current) => ({ ...current, [task.wbsTaskId]: "" }));
    updatePendingState(task.wbsTaskId, true);
    try {
      await updateWbsTask.mutateAsync({ request: result.request, taskId: task.wbsTaskId });
      setHourEditor(null);
    } catch (error) {
      setRowErrors((current) => ({ ...current, [task.wbsTaskId]: messageOf(error) }));
    } finally {
      updatePendingState(task.wbsTaskId, false);
    }
  };

  const handleProgressChange = async (task: WbsTask, progressRate: number) => {
    setPendingProgressRates((current) => ({ ...current, [task.wbsTaskId]: progressRate }));
    setRowErrors((current) => ({ ...current, [task.wbsTaskId]: "" }));
    updatePendingState(task.wbsTaskId, true);
    try {
      await updateWbsProgress.mutateAsync({ request: { progressRate }, taskId: task.wbsTaskId });
    } catch (error) {
      setRowErrors((current) => ({ ...current, [task.wbsTaskId]: messageOf(error) }));
    } finally {
      setPendingProgressRates((current) => {
        const remaining = { ...current };
        delete remaining[task.wbsTaskId];
        return remaining;
      });
      updatePendingState(task.wbsTaskId, false);
    }
  };

  return (
    <section
      className={`wbs-gantt-board${isManagementColumnsCollapsed ? " is-management-columns-collapsed" : ""}`}
      aria-label="WBSガントテーブル"
      role="table"
    >
      <div className="wbs-gantt-fixed-pane" role="rowgroup">
        <BoardHeader
          isManagementColumnsCollapsed={isManagementColumnsCollapsed}
          onToggleManagementColumns={() => setIsManagementColumnsCollapsed((current) => !current)}
        />
        {tasks.length === 0 ? (
          <EmptyFixedRow onCreate={onCreate} />
        ) : (
          tasks.map((task) => (
            <WbsGanttFixedRow
              hourEditor={hourEditor}
              isManagementColumnsCollapsed={isManagementColumnsCollapsed}
              isPending={pendingTaskIds.has(task.wbsTaskId)}
              isSelected={task.wbsTaskId === selectedTaskId}
              key={task.wbsTaskId}
              onHourEditorChange={(value) => setHourEditor({ taskId: task.wbsTaskId, value })}
              onHourEditorClose={() => setHourEditor(null)}
              onHourEditorOpen={(selectedTask) => {
                setRowErrors((current) => ({ ...current, [selectedTask.wbsTaskId]: "" }));
                setHourEditor({ taskId: selectedTask.wbsTaskId, value: selectedTask.plannedHours?.toString() ?? "" });
              }}
              onPlannedHoursSave={(selectedTask) => void handlePlannedHoursSave(selectedTask)}
              onProgressChange={(selectedTask, progressRate) => void handleProgressChange(selectedTask, progressRate)}
              onSelect={onSelect}
              progressRate={pendingProgressRates[task.wbsTaskId] ?? task.progressRate ?? 0}
              rowError={rowErrors[task.wbsTaskId]}
              task={task}
            />
          ))
        )}
      </div>

      <div className="wbs-gantt-timeline-column">
        <div className="wbs-gantt-timeline-header-viewport" role="rowgroup">
          <div className="wbs-gantt-timeline-header-pane" ref={timelineHeaderPaneRef} role="presentation" style={{ width: `${timelineWidth}px` }}>
            <TimelineHeader isTimelineAvailable={isTimelineAvailable} timelineDates={timelineDates} today={today} />
          </div>
        </div>
        <div
          className="wbs-gantt-timeline-scroll"
          onScroll={(event) => {
            if (timelineHeaderPaneRef.current !== null) {
              timelineHeaderPaneRef.current.style.transform = `translateX(-${event.currentTarget.scrollLeft}px)`;
            }
          }}
        >
          <div className="wbs-gantt-timeline-pane" role="rowgroup" style={{ width: `${timelineWidth}px` }}>
            {tasks.length === 0 ? (
              <EmptyTimelineRow isTimelineAvailable={isTimelineAvailable} />
            ) : (
              tasks.map((task) => (
                <TimelineRow
                  endDate={endDate}
                  isSelected={task.wbsTaskId === selectedTaskId}
                  key={task.wbsTaskId}
                  startDate={startDate}
                  task={task}
                  timelineWidth={timelineWidth}
                  today={today}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const BoardHeader = ({
  isManagementColumnsCollapsed,
  onToggleManagementColumns,
}: {
  isManagementColumnsCollapsed: boolean;
  onToggleManagementColumns: () => void;
}) => (
  <div className="wbs-gantt-fixed-row is-header" role="row">
    <div aria-label="件名" className="wbs-gantt-task-column-header" role="columnheader">
      <span>件名</span>
      <button
        aria-label={isManagementColumnsCollapsed ? "工数・進捗を表示" : "工数・進捗を隠す"}
        aria-pressed={isManagementColumnsCollapsed}
        className="wbs-gantt-column-toggle"
        onClick={onToggleManagementColumns}
        type="button"
      >
        {isManagementColumnsCollapsed ? "工数・進捗を表示" : "工数・進捗を隠す"}
      </button>
    </div>
    {!isManagementColumnsCollapsed && (
      <>
        <span role="columnheader">予定(h)</span>
        <span role="columnheader">実績(h)</span>
        <span role="columnheader">進捗</span>
      </>
    )}
  </div>
);

const TimelineHeader = ({
  isTimelineAvailable,
  timelineDates,
  today,
}: {
  isTimelineAvailable: boolean;
  timelineDates: string[];
  today: string;
}) => (
  <div className="wbs-gantt-timeline-row is-header" role="row">
    {isTimelineAvailable ? (
      <div
        aria-label={`ガント表示期間 ${timelineDates[0]} から ${timelineDates.at(-1)}`}
        className="wbs-gantt-date-axis"
        role="columnheader"
        style={{ gridTemplateColumns: `repeat(${timelineDates.length}, ${ganttDayWidth}px)` }}
      >
        {timelineDates.map((date) => (
          <span className={date === today ? "is-today" : ""} key={date}>
            {formatAxisDate(date)}
          </span>
        ))}
      </div>
    ) : (
      <span className="wbs-gantt-unavailable" role="columnheader">
        表示期間を取得できません。
      </span>
    )}
  </div>
);

const TimelineRow = ({
  endDate,
  isSelected,
  startDate,
  task,
  timelineWidth,
  today,
}: {
  endDate: string | null;
  isSelected: boolean;
  startDate: string | null;
  task: WbsTask;
  timelineWidth: number;
  today: string;
}) => {
  const isParent = task.taskType === "PARENT";
  const isTimelineAvailable = startDate !== null && endDate !== null;
  const placement =
    isTimelineAvailable && task.plannedStartDate !== null && task.plannedEndDate !== null
      ? ganttBarPlacement(startDate, endDate, task.plannedStartDate, task.plannedEndDate)
      : null;
  const todayPlacement = isTimelineAvailable ? ganttBarPlacement(startDate, endDate, today, today) : null;
  const clippedLabel = [placement?.isClippedAtStart ? "開始日が期間外" : null, placement?.isClippedAtEnd ? "終了日が期間外" : null]
    .filter((label): label is string => label !== null)
    .join("、");

  return (
    <div className={`wbs-gantt-timeline-row${isParent ? " is-parent" : ""}${isSelected ? " is-selected" : ""}`} role="row">
      <div
        className="wbs-gantt-track"
        role="cell"
        style={{ backgroundSize: `${ganttDayWidth}px 100%`, width: `${timelineWidth}px` }}
      >
        {todayPlacement !== null && <span className="wbs-gantt-today-marker" style={{ left: `${todayPlacement.offsetDays * ganttDayWidth}px` }} />}
        {isParent ? (
          <span className="wbs-gantt-parent-note">配下タスクで管理</span>
        ) : task.plannedStartDate === null || task.plannedEndDate === null ? (
          <span className="wbs-gantt-empty-note">予定日未設定</span>
        ) : placement === null ? (
          <span className="wbs-gantt-empty-note">プロジェクト期間外</span>
        ) : (
          <span
            aria-label={`${task.name}: ${task.plannedStartDate} から ${task.plannedEndDate}${clippedLabel.length > 0 ? `、${clippedLabel}` : ""}`}
            className={`wbs-gantt-bar${placement.isClippedAtStart ? " is-clipped-start" : ""}${placement.isClippedAtEnd ? " is-clipped-end" : ""}`}
            style={{
              left: `${placement.offsetDays * ganttDayWidth + 4}px`,
              width: `${Math.max(ganttDayWidth - 8, placement.visibleDayCount * ganttDayWidth - 8)}px`,
            }}
          >
            {task.progressRate}%
          </span>
        )}
      </div>
    </div>
  );
};

const EmptyFixedRow = ({ onCreate }: { onCreate: (taskType: WbsTaskType) => void }) => (
  <div className="wbs-gantt-fixed-row is-empty" role="row">
    <div className="wbs-gantt-empty-content" role="cell">
      <strong>WBSタスクがありません</strong>
      <p>親タスクで学習範囲をまとめるか、親なしのLEAFタスクを直接追加してください。</p>
      <div className="button-row">
        <button className="secondary-button" onClick={() => onCreate("PARENT")} type="button">
          最初の親タスクを追加
        </button>
        <button className="primary-button" onClick={() => onCreate("LEAF")} type="button">
          親なしタスクを追加
        </button>
      </div>
    </div>
  </div>
);

const EmptyTimelineRow = ({ isTimelineAvailable }: { isTimelineAvailable: boolean }) => (
  <div className="wbs-gantt-timeline-row is-empty" role="row">
    <div className="wbs-gantt-track" role="cell">
      {isTimelineAvailable && <span className="wbs-gantt-empty-note">予定期間はここに表示されます。</span>}
    </div>
  </div>
);

const formatAxisDate = (date: string): string => {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
};
