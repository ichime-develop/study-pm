import { useState } from "react";

import { messageOf } from "../../shared/api/errorMessages";
import type { ProjectStatus } from "./projectTypes";

// プロジェクトの状態をヘッダーから変更するモーダルを表示する。
type ProjectStatusModalProps = {
  canComplete: boolean;
  error: unknown;
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: (status: ProjectStatus) => void;
  projectName: string;
  status: ProjectStatus;
};

const statusOptions: Array<{ label: string; value: ProjectStatus }> = [
  { label: "未着手", value: "NOT_STARTED" },
  { label: "進行中", value: "IN_PROGRESS" },
  { label: "完了", value: "COMPLETED" },
];

export const ProjectStatusModal = ({
  canComplete,
  error,
  isSaving,
  onCancel,
  onConfirm,
  projectName,
  status,
}: ProjectStatusModalProps) => {
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus>(status);
  const isStatusUnchanged = selectedStatus === status;

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-labelledby="project-status-title" aria-modal="true" className="modal-dialog project-status-modal" role="dialog">
        <p className="eyebrow">プロジェクトの状態</p>
        <h2 id="project-status-title">「{projectName}」の状態を変更</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm(selectedStatus);
          }}
        >
          <fieldset>
            <legend>状態</legend>
            <div className="project-status-options">
              {statusOptions.map((option) => {
                const isCompletionOption = option.value === "COMPLETED";
                const isDisabled = isCompletionOption && !canComplete;

                return (
                  <label className={isDisabled ? "is-disabled" : undefined} key={option.value}>
                    <input
                      checked={selectedStatus === option.value}
                      disabled={isDisabled || isSaving}
                      name="project-status"
                      onChange={() => setSelectedStatus(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
          {!canComplete && (
            <p className="form-message">
              完了にするには、LEAFタスクを1件以上作成し、すべての進捗率を100%にしてください。
            </p>
          )}
          {error !== null && <p className="error-text form-message">{messageOf(error)}</p>}
          <div className="button-row">
            <button className="secondary-button" disabled={isSaving} onClick={onCancel} type="button">
              キャンセル
            </button>
            <button className="primary-button" disabled={isSaving || isStatusUnchanged} type="submit">
              {isSaving ? "保存しています..." : "変更を保存"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
