// プロジェクト内の学習記録を日付順に一覧表示し、編集対象の選択を提供する。
import { formatHours, formatMonthDay } from "../../shared/types/formatters";
import type { StudyLog } from "./studyLogTypes";

type StudyLogListProps = {
  onSelect: (studyLog: StudyLog) => void;
  studyLogs: StudyLog[];
};

export const StudyLogList = ({ onSelect, studyLogs }: StudyLogListProps) => {
  if (studyLogs.length === 0) {
    return <p className="empty-message">条件に一致する学習記録はありません。</p>;
  }

  return (
    <section aria-label="学習記録一覧" className="study-log-list">
      <div aria-hidden="true" className="study-log-row study-log-header">
        <span>学習日</span>
        <span>対象タスク</span>
        <span>学習時間</span>
        <span>メモ</span>
      </div>
      {studyLogs.map((studyLog) => (
        <button
          aria-label={`${studyLog.studyDate} ${studyLog.wbsTaskName}の学習記録を編集`}
          className="study-log-row study-log-item"
          key={studyLog.studyLogId}
          onClick={() => onSelect(studyLog)}
          type="button"
        >
          <span>{formatMonthDay(studyLog.studyDate)}</span>
          <span className="study-log-task-name">{studyLog.wbsTaskName}</span>
          <span>{formatHours(studyLog.studyHours)}</span>
          <span>{studyLog.memo === null ? "-" : "あり"}</span>
        </button>
      ))}
    </section>
  );
};
