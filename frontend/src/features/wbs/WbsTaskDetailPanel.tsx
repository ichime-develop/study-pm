// 選択したWBSタスクの基本・計画・進捗更新と削除操作を右サイドパネルで提供する。
import { type SubmitEvent, useEffect, useState } from "react";

import { isApiClientError } from "../../shared/api/apiTypes";
import { fieldMessageOf, messageOf } from "../../shared/api/errorMessages";
import { FieldError } from "../../shared/components/FieldError";
import { WbsTaskDeleteModal } from "./WbsTaskDeleteModal";
import { useDeleteWbsTask, useUpdateWbsTask } from "./useWbs";
import { buildWbsTaskUpdateRequest } from "./wbsTaskUpdateRequest";
import type { WbsTask } from "./wbsTypes";

type WbsTaskDetailPanelProps = {
  onClose: () => void;
  onCreateStudyLog: () => void;
  onTaskNotFound: () => void;
  projectId: string;
  successMessage?: string;
  task: WbsTask;
  tasks: WbsTask[];
};

export const WbsTaskDetailPanel = ({
  onClose,
  onCreateStudyLog,
  onTaskNotFound,
  projectId,
  successMessage,
  task,
  tasks,
}: WbsTaskDetailPanelProps) => {
  const updateWbsTask = useUpdateWbsTask(projectId);
  const deleteWbsTask = useDeleteWbsTask(projectId, task.wbsTaskId);
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description ?? "");
  const [parentTaskId, setParentTaskId] = useState(task.parentTaskId ?? "");
  const [plannedStartDate, setPlannedStartDate] = useState(task.plannedStartDate ?? "");
  const [plannedEndDate, setPlannedEndDate] = useState(task.plannedEndDate ?? "");
  const [plannedHours, setPlannedHours] = useState(task.plannedHours?.toString() ?? "");
  const [clientError, setClientError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const isParent = task.taskType === "PARENT";
  const parentTasks = tasks.filter((candidate) => candidate.taskType === "PARENT");
  const childTasks = tasks.filter((candidate) => candidate.parentTaskId === task.wbsTaskId);
  const hasRelatedStudyLogs = isParent
    ? childTasks.some((childTask) => childTask.hasStudyLogs)
    : task.hasStudyLogs;
  const isSaving = updateWbsTask.isPending || deleteWbsTask.isPending;

  useEffect(() => {
    setName(task.name);
    setDescription(task.description ?? "");
    setParentTaskId(task.parentTaskId ?? "");
    setPlannedStartDate(task.plannedStartDate ?? "");
    setPlannedEndDate(task.plannedEndDate ?? "");
    setPlannedHours(task.plannedHours?.toString() ?? "");
  }, [task]);

  const handleTaskNotFound = (error: unknown) => {
    if (isApiClientError(error) && error.status === 404) {
      onTaskNotFound();
    }
  };

  const handleSave = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = buildWbsTaskUpdateRequest({
      description,
      name,
      parentTaskId,
      plannedEndDate,
      plannedHours,
      plannedStartDate,
      task,
    });
    if (result.error !== undefined) {
      setClientError(result.error);
      return;
    }
    updateWbsTask.mutate(
      { request: result.request, taskId: task.wbsTaskId },
      {
        onError: handleTaskNotFound,
        onSuccess: onClose,
      },
    );
  };

  const handleDelete = () => {
    deleteWbsTask.mutate(undefined, {
      onError: handleTaskNotFound,
      onSuccess: onClose,
    });
  };

  const handleFieldChange = (setter: (value: string) => void, value: string) => {
    setClientError(null);
    setter(value);
  };
  const formError = clientError ?? (updateWbsTask.error === null ? undefined : messageOf(updateWbsTask.error));

  return (
    <aside className="wbs-task-panel" aria-label={`${task.name}を編集`}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">{isParent ? "親タスク" : "LEAFタスク"}</p>
          <h2>{task.name}</h2>
        </div>
        <button aria-label="編集パネルを閉じる" className="secondary-button" onClick={onClose} type="button">
          閉じる
        </button>
      </div>

      <form className="form" noValidate onSubmit={handleSave}>
        {successMessage !== undefined && <p className="notice notice-success">{successMessage}</p>}
        <label>
          <span className="wbs-field-label">
            {isParent ? "親タスク名" : "タスク名"} <RequiredMark />
          </span>
          <input
            maxLength={100}
            onChange={(event) => handleFieldChange(setName, event.target.value)}
            type="text"
            value={name}
          />
          <FieldError message={fieldMessageOf(updateWbsTask.error, "name")} />
        </label>

        <label>
          説明（任意）
          <textarea
            maxLength={5000}
            onChange={(event) => handleFieldChange(setDescription, event.target.value)}
            rows={4}
            value={description}
          />
          <FieldError message={fieldMessageOf(updateWbsTask.error, "description")} />
        </label>

        {isParent ? (
          <p className="status-note">親タスクは見出しです。予定日、予定工数、進捗率は持ちません。</p>
        ) : (
          <>
            <label>
              親タスク（任意）
              <select onChange={(event) => handleFieldChange(setParentTaskId, event.target.value)} value={parentTaskId}>
                <option value="">親なしで配置</option>
                {parentTasks.map((parentTask) => (
                  <option key={parentTask.wbsTaskId} value={parentTask.wbsTaskId}>
                    {parentTask.name}
                  </option>
                ))}
              </select>
              <FieldError message={fieldMessageOf(updateWbsTask.error, "parentTaskId")} />
            </label>

            <div className="form-two-columns">
              <label>
                予定開始日（任意）
                <input
                  onChange={(event) => handleFieldChange(setPlannedStartDate, event.target.value)}
                  type="date"
                  value={plannedStartDate}
                />
              </label>
              <label>
                予定終了日（任意）
                <input
                  onChange={(event) => handleFieldChange(setPlannedEndDate, event.target.value)}
                  type="date"
                  value={plannedEndDate}
                />
              </label>
            </div>
            <label>
              <span className="wbs-field-label">
                予定工数 <RequiredMark />
              </span>
              <div className="input-with-unit">
                <input
                  inputMode="decimal"
                  max="9999.99"
                  min="0.25"
                  onChange={(event) => handleFieldChange(setPlannedHours, event.target.value)}
                  step="0.25"
                  type="number"
                  value={plannedHours}
                />
                <span>時間</span>
              </div>
              <FieldError message={fieldMessageOf(updateWbsTask.error, "plannedHours")} />
            </label>
          </>
        )}

        {!isParent && (
          <div className="wbs-task-actual-hours">
            <span className="wbs-field-label">実績工数（任意）</span>
            <button className="secondary-button" disabled={isSaving} onClick={onCreateStudyLog} type="button">
              学習記録を追加
            </button>
          </div>
        )}

        {hasRelatedStudyLogs && (
          <section className="wbs-task-constraint" aria-label="削除できない理由">
            <h3>削除できない理由</h3>
            <p>{isParent ? "配下タスクに学習記録があるため削除できません。" : "学習記録があるタスクは削除できません。"}</p>
          </section>
        )}

        {formError !== undefined && <p className="error-text form-message">{formError}</p>}
        <div className="button-row">
          <button className="primary-button" disabled={isSaving} type="submit">
            {updateWbsTask.isPending ? "保存しています..." : "保存"}
          </button>
          <button
            className="danger-button"
            disabled={isSaving || hasRelatedStudyLogs}
            onClick={() => setIsDeleteModalOpen(true)}
            title={hasRelatedStudyLogs ? "学習記録があるタスクは削除できません。" : undefined}
            type="button"
          >
            {hasRelatedStudyLogs ? "削除不可" : "削除"}
          </button>
        </div>
      </form>

      {isDeleteModalOpen && (
        <WbsTaskDeleteModal
          childTasks={childTasks}
          error={deleteWbsTask.error}
          isDeleting={deleteWbsTask.isPending}
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          task={task}
        />
      )}
    </aside>
  );
};

const RequiredMark = () => <span aria-label="必須" className="required-mark">*</span>;
