// WBSタスク削除の対象と復元不可の影響を確認するモーダルを表示する。
import { messageOf } from "../../shared/api/errorMessages";
import type { WbsTask } from "./wbsTypes";

type WbsTaskDeleteModalProps = {
  childTasks: WbsTask[];
  error: unknown;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  task: WbsTask;
};

export const WbsTaskDeleteModal = ({
  childTasks,
  error,
  isDeleting,
  onCancel,
  onConfirm,
  task,
}: WbsTaskDeleteModalProps) => {
  const isParent = task.taskType === "PARENT";

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-labelledby="delete-wbs-task-title" aria-modal="true" className="modal-dialog" role="dialog">
        <p className="eyebrow">WBSタスク削除</p>
        <h2 id="delete-wbs-task-title">「{task.name}」を削除しますか？</h2>
        {isParent ? (
          <>
            <p>配下のLEAFタスクも削除されます。削除したタスクは復元できません。</p>
            {childTasks.length > 0 && (
              <ul className="delete-target-list">
                {childTasks.map((childTask) => (
                  <li key={childTask.wbsTaskId}>{childTask.name}</li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p>削除したタスクは復元できません。</p>
        )}
        {error != null && <p className="error-text form-message">{messageOf(error)}</p>}
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
};
