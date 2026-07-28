// 親タスクまたはLEAFタスクを右サイドパネルから作成する。
import { type SubmitEvent, useState } from "react";

import { fieldMessageOf, messageOf } from "../../shared/api/errorMessages";
import { FieldError } from "../../shared/components/FieldError";
import { useCreateWbsTask } from "./useWbs";
import type { WbsTask, WbsTaskType } from "./wbsTypes";

type WbsTaskCreatePanelProps = {
  mode: WbsTaskType;
  onClose: () => void;
  projectId: string;
  tasks: WbsTask[];
};

export const WbsTaskCreatePanel = ({ mode, onClose, projectId, tasks }: WbsTaskCreatePanelProps) => {
  const createWbsTask = useCreateWbsTask(projectId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentTaskId, setParentTaskId] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [plannedHours, setPlannedHours] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const parentTasks = tasks.filter((task) => task.taskType === "PARENT");
  const isParent = mode === "PARENT";

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setClientError("名称を入力してください。");
      return;
    }

    if (isParent) {
      createWbsTask.mutate(
        {
          taskType: "PARENT",
          name: trimmedName,
          description: emptyToNull(description),
          parentTaskId: null,
          plannedStartDate: null,
          plannedEndDate: null,
          plannedHours: null,
        },
        { onSuccess: onClose },
      );
      return;
    }

    const hours = Number(plannedHours);
    if (!isValidPlannedHours(hours)) {
      setClientError("予定工数は0.25時間以上9999.99時間以下の0.25時間刻みで入力してください。");
      return;
    }
    if (plannedStartDate !== "" && plannedEndDate !== "" && plannedStartDate > plannedEndDate) {
      setClientError("予定開始日は予定終了日以前にしてください。");
      return;
    }

    createWbsTask.mutate(
      {
        taskType: "LEAF",
        name: trimmedName,
        description: emptyToNull(description),
        parentTaskId: emptyToNull(parentTaskId),
        plannedStartDate: emptyToNull(plannedStartDate),
        plannedEndDate: emptyToNull(plannedEndDate),
        plannedHours: hours,
      },
      { onSuccess: onClose },
    );
  };

  const handleChange = (setter: (value: string) => void, value: string) => {
    setClientError(null);
    setter(value);
  };
  const formError = clientError ?? (createWbsTask.error === null ? undefined : messageOf(createWbsTask.error));

  return (
    <aside className="wbs-task-panel" aria-label={isParent ? "親タスクを追加" : "タスクを追加"}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">{isParent ? "親タスクを追加" : "タスクを追加"}</p>
          {isParent && <h2>学習範囲の見出しを作る</h2>}
        </div>
        <button aria-label="作成パネルを閉じる" className="secondary-button" onClick={onClose} type="button">
          閉じる
        </button>
      </div>

      <form className="form" noValidate onSubmit={handleSubmit}>
        <label>
          <span className="wbs-field-label">
            {isParent ? "親タスク名" : "タスク名"} <RequiredMark />
          </span>
          <input
            maxLength={100}
            onChange={(event) => handleChange(setName, event.target.value)}
            type="text"
            value={name}
          />
          <FieldError message={fieldMessageOf(createWbsTask.error, "name")} />
        </label>

        <label>
          説明（任意）
          <textarea
            maxLength={5000}
            onChange={(event) => handleChange(setDescription, event.target.value)}
            rows={2}
            value={description}
          />
          <FieldError message={fieldMessageOf(createWbsTask.error, "description")} />
        </label>

        {isParent ? (
          <p className="status-note">
            親タスクは見出しです。予定日、予定工数、進捗率は持たず、配下のLEAFタスクで管理します。
          </p>
        ) : (
          <>
            <label>
              親タスク（任意）
              <select onChange={(event) => handleChange(setParentTaskId, event.target.value)} value={parentTaskId}>
                <option value="">親なしで追加</option>
                {parentTasks.map((task) => (
                  <option key={task.wbsTaskId} value={task.wbsTaskId}>
                    {task.name}
                  </option>
                ))}
              </select>
              <FieldError message={fieldMessageOf(createWbsTask.error, "parentTaskId")} />
            </label>

            <div className="form-two-columns">
              <label>
                予定開始日（任意）
                <input
                  onChange={(event) => handleChange(setPlannedStartDate, event.target.value)}
                  type="date"
                  value={plannedStartDate}
                />
              </label>
              <label>
                予定終了日（任意）
                <input
                  onChange={(event) => handleChange(setPlannedEndDate, event.target.value)}
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
                  onChange={(event) => handleChange(setPlannedHours, event.target.value)}
                  step="0.25"
                  type="number"
                  value={plannedHours}
                />
                <span>時間</span>
              </div>
              <FieldError message={fieldMessageOf(createWbsTask.error, "plannedHours")} />
            </label>
            <p className="field-note">進捗率は0%で作成されます。</p>
          </>
        )}

        {formError !== undefined && <p className="form-message error-text">{formError}</p>}
        <div className="button-row">
          <button className="primary-button" disabled={createWbsTask.isPending} type="submit">
            {createWbsTask.isPending ? "追加しています..." : "追加"}
          </button>
          <button className="secondary-button" disabled={createWbsTask.isPending} onClick={onClose} type="button">
            キャンセル
          </button>
        </div>
      </form>
    </aside>
  );
};

const RequiredMark = () => <span aria-label="必須" className="required-mark">*</span>;

const emptyToNull = (value: string): string | null => {
  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? null : trimmedValue;
};

const isValidPlannedHours = (hours: number): boolean =>
  Number.isFinite(hours) &&
  hours >= 0.25 &&
  hours <= 9999.99 &&
  Math.abs(hours * 4 - Math.round(hours * 4)) < 1e-9;
