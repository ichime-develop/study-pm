// 学習記録削除前に対象と再計算の影響を確認するモーダルを表示する。
import { messageOf } from "../../shared/api/errorMessages";
import { formatHours, formatMonthDay } from "../../shared/format/formatters";
import type { StudyLog } from "./studyLogTypes";

type StudyLogDeleteModalProps = {
  error: unknown;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  studyLog: StudyLog;
};

export const StudyLogDeleteModal = ({
  error,
  isDeleting,
  onCancel,
  onConfirm,
  studyLog,
}: StudyLogDeleteModalProps) => (
  <div className="modal-backdrop" role="presentation">
    <section aria-labelledby="delete-study-log-title" aria-modal="true" className="modal-dialog" role="dialog">
      <p className="eyebrow">学習記録削除</p>
      <h2 id="delete-study-log-title">この学習記録を削除しますか？</h2>
      <p>
        {formatMonthDay(studyLog.studyDate)} / {studyLog.wbsTaskName} / {formatHours(studyLog.studyHours)}
      </p>
      <p>削除後にプロジェクトとタスクの実績工数を再計算します。削除した記録は復元できません。</p>
      {error !== null && <p className="error-text form-message">{messageOf(error)}</p>}
      <div className="button-row">
        <button className="secondary-button" disabled={isDeleting} onClick={onCancel} type="button">
          キャンセル
        </button>
        <button className="danger-button" disabled={isDeleting} onClick={onConfirm} type="button">
          {isDeleting ? "削除しています..." : "削除する"}
        </button>
      </div>
    </section>
  </div>
);
