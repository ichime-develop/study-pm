// API-WB-01の返却順を維持してWBSタスクと予定情報を表形式で表示する。
import { formatHours, formatProgressRate } from "../../shared/types/formatters";
import type { WbsTask, WbsTaskType } from "./wbsTypes";

type WbsTaskTableProps = {
  onCreate: (taskType: WbsTaskType) => void;
  tasks: WbsTask[];
};

export const WbsTaskTable = ({ onCreate, tasks }: WbsTaskTableProps) => {
  if (tasks.length === 0) {
    return (
      <div className="wbs-empty-table" role="status">
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
    );
  }

  return (
    <div className="wbs-table-scroll">
      <table className="wbs-table">
        <thead>
          <tr>
            <th scope="col">タスク</th>
            <th scope="col">予定期間</th>
            <th scope="col">予定工数</th>
            <th scope="col">実績工数</th>
            <th scope="col">進捗率</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const isParent = task.taskType === "PARENT";
            return (
              <tr className={isParent ? "wbs-parent-row" : "wbs-leaf-row"} key={task.wbsTaskId}>
                <td>
                  <strong className={task.parentTaskId === null ? undefined : "wbs-child-task"}>{task.name}</strong>
                  <small>{isParent ? "親タスク（見出し）" : task.description ?? "説明は未設定です。"}</small>
                </td>
                <td>{isParent ? "-" : formatPeriod(task.plannedStartDate, task.plannedEndDate)}</td>
                <td>{formatHours(task.plannedHours)}</td>
                <td>{formatHours(task.actualHours)}</td>
                <td>{formatProgressRate(task.progressRate)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const formatPeriod = (startDate: string | null, endDate: string | null): string => {
  if (startDate === null && endDate === null) {
    return "-";
  }
  return `${startDate ?? "-"} - ${endDate ?? "-"}`;
};
