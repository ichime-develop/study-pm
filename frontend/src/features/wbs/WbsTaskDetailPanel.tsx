// 選択したWBSタスクの基本・計画・進捗更新と削除操作を右サイドパネルで提供する。
import { type FormEvent, useEffect, useState } from "react";

import { isApiClientError } from "../../shared/api/apiTypes";
import { fieldMessageOf, messageOf } from "../../shared/api/errorMessages";
import { FieldError } from "../../shared/components/FieldError";
import { WbsTaskDeleteModal } from "./WbsTaskDeleteModal";
import { useDeleteWbsTask, useUpdateWbsProgress, useUpdateWbsTask } from "./useWbs";
import type { WbsTask, WbsTaskUpdateRequest } from "./wbsTypes";

type WbsTaskDetailPanelProps = {
  onClose: () => void;
  onTaskNotFound: () => void;
  projectId: string;
  task: WbsTask;
  tasks: WbsTask[];
};

const progressRates = Array.from({ length: 11 }, (_, index) => index * 10);

export const WbsTaskDetailPanel = ({
  onClose,
  onTaskNotFound,
  projectId,
  task,
  tasks,
}: WbsTaskDetailPanelProps) => {
  const updateWbsTask = useUpdateWbsTask(projectId, task.wbsTaskId);
  const updateWbsProgress = useUpdateWbsProgress(projectId, task.wbsTaskId);
  const deleteWbsTask = useDeleteWbsTask(projectId, task.wbsTaskId);
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description ?? "");
  const [parentTaskId, setParentTaskId] = useState(task.parentTaskId ?? "");
  const [plannedStartDate, setPlannedStartDate] = useState(task.plannedStartDate ?? "");
  const [plannedEndDate, setPlannedEndDate] = useState(task.plannedEndDate ?? "");
  const [plannedHours, setPlannedHours] = useState(task.plannedHours?.toString() ?? "");
  const [progressRate, setProgressRate] = useState(task.progressRate?.toString() ?? "0");
  const [clientError, setClientError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const isParent = task.taskType === "PARENT";
  const parentTasks = tasks.filter((candidate) => candidate.taskType === "PARENT");
  const childTasks = tasks.filter((candidate) => candidate.parentTaskId === task.wbsTaskId);
  const isSaving = updateWbsTask.isPending || updateWbsProgress.isPending || deleteWbsTask.isPending;

  useEffect(() => {
    setName(task.name);
    setDescription(task.description ?? "");
    setParentTaskId(task.parentTaskId ?? "");
    setPlannedStartDate(task.plannedStartDate ?? "");
    setPlannedEndDate(task.plannedEndDate ?? "");
    setPlannedHours(task.plannedHours?.toString() ?? "");
    setProgressRate(task.progressRate?.toString() ?? "0");
  }, [task]);

  const handleTaskNotFound = (error: unknown) => {
    if (isApiClientError(error) && error.status === 404) {
      onTaskNotFound();
    }
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const request = buildUpdateRequest({
      description,
      isParent,
      name,
      parentTaskId,
      plannedEndDate,
      plannedHours,
      plannedStartDate,
      setClientError,
    });
    if (request === undefined) {
      return;
    }
    updateWbsTask.mutate(request, { onError: handleTaskNotFound });
  };

  const handleProgressSave = () => {
    updateWbsProgress.mutate({ progressRate: Number(progressRate) }, { onError: handleTaskNotFound });
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
  const progressError = updateWbsProgress.error === null ? undefined : messageOf(updateWbsProgress.error);

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
        <label>
          {isParent ? "親タスク名" : "タスク名"} <RequiredMark />
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
              予定工数 <RequiredMark />
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

        {formError !== undefined && <p className="error-text form-message">{formError}</p>}
        <div className="button-row">
          <button className="primary-button" disabled={isSaving} type="submit">
            {updateWbsTask.isPending ? "保存しています..." : "基本情報を保存"}
          </button>
          <button className="danger-button" disabled={isSaving} onClick={() => setIsDeleteModalOpen(true)} type="button">
            削除
          </button>
        </div>
      </form>

      {!isParent && (
        <section className="wbs-progress-section" aria-labelledby="wbs-progress-title">
          <h3 id="wbs-progress-title">進捗率</h3>
          <p className="field-note">進捗率を変更した場合だけ履歴を追加します。</p>
          <div className="progress-update-row">
            <select aria-label="進捗率" onChange={(event) => setProgressRate(event.target.value)} value={progressRate}>
              {progressRates.map((value) => (
                <option key={value} value={value}>
                  {value}%
                </option>
              ))}
            </select>
            <button className="secondary-button" disabled={isSaving} onClick={handleProgressSave} type="button">
              {updateWbsProgress.isPending ? "更新しています..." : "進捗を更新"}
            </button>
          </div>
          {progressError !== undefined && <p className="error-text form-message">{progressError}</p>}
        </section>
      )}

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

type BuildUpdateRequestInput = {
  description: string;
  isParent: boolean;
  name: string;
  parentTaskId: string;
  plannedEndDate: string;
  plannedHours: string;
  plannedStartDate: string;
  setClientError: (message: string | null) => void;
};

const buildUpdateRequest = ({
  description,
  isParent,
  name,
  parentTaskId,
  plannedEndDate,
  plannedHours,
  plannedStartDate,
  setClientError,
}: BuildUpdateRequestInput): WbsTaskUpdateRequest | undefined => {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    setClientError("名称を入力してください。");
    return undefined;
  }
  if (isParent) {
    return {
      name: trimmedName,
      description: emptyToNull(description),
      parentTaskId: null,
      plannedStartDate: null,
      plannedEndDate: null,
      plannedHours: null,
    };
  }

  const hours = Number(plannedHours);
  if (!isValidPlannedHours(hours)) {
    setClientError("予定工数は0.25時間以上9999.99時間以下の0.25時間刻みで入力してください。");
    return undefined;
  }
  if (plannedStartDate !== "" && plannedEndDate !== "" && plannedStartDate > plannedEndDate) {
    setClientError("予定開始日は予定終了日以前にしてください。");
    return undefined;
  }
  return {
    name: trimmedName,
    description: emptyToNull(description),
    parentTaskId: emptyToNull(parentTaskId),
    plannedStartDate: emptyToNull(plannedStartDate),
    plannedEndDate: emptyToNull(plannedEndDate),
    plannedHours: hours,
  };
};

const emptyToNull = (value: string): string | null => {
  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? null : trimmedValue;
};

const isValidPlannedHours = (hours: number): boolean =>
  Number.isFinite(hours) &&
  hours >= 0.25 &&
  hours <= 9999.99 &&
  Math.abs(hours * 4 - Math.round(hours * 4)) < 1e-9;

const RequiredMark = () => <span aria-label="必須" className="required-mark">*</span>;
