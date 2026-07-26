// プロジェクト削除前に対象と復元不可の影響を確認するモーダルを表示する。
import { messageOf } from "../../shared/api/errorMessages";

type ProjectDeleteModalProps = {
  error: unknown;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  projectName: string;
};

export const ProjectDeleteModal = ({
  error,
  isDeleting,
  onCancel,
  onConfirm,
  projectName,
}: ProjectDeleteModalProps) => (
  <div className="modal-backdrop" role="presentation">
    <section aria-labelledby="delete-project-title" aria-modal="true" className="modal-dialog" role="dialog">
      <p className="eyebrow">プロジェクト削除</p>
      <h2 id="delete-project-title">「{projectName}」を削除しますか？</h2>
      <p>
        関連するWBSと学習記録を含めて削除されます。削除したプロジェクトは復元できません。
      </p>
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
