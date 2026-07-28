// 親タスクまたはLEAFタスクを右サイドパネルから作成する。
import { type SubmitEvent, useState } from "react";

import { fieldMessageOf, messageOf } from "../../shared/api/errorMessages";
import { useCreateWbsTask } from "./useWbs";
import { WbsTaskFields, type WbsTaskFieldName } from "./WbsTaskFields";
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
  const handleFieldChange = (field: WbsTaskFieldName, value: string) => {
    const setters: Record<WbsTaskFieldName, (nextValue: string) => void> = {
      description: setDescription,
      name: setName,
      parentTaskId: setParentTaskId,
      plannedEndDate: setPlannedEndDate,
      plannedHours: setPlannedHours,
      plannedStartDate: setPlannedStartDate,
    };
    handleChange(setters[field], value);
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
        <WbsTaskFields
          descriptionRows={2}
          fieldErrors={{
            description: fieldMessageOf(createWbsTask.error, "description"),
            name: fieldMessageOf(createWbsTask.error, "name"),
            parentTaskId: fieldMessageOf(createWbsTask.error, "parentTaskId"),
            plannedHours: fieldMessageOf(createWbsTask.error, "plannedHours"),
          }}
          isParent={isParent}
          onChange={handleFieldChange}
          parentTaskEmptyLabel="親なしで追加"
          parentTaskNote="親タスクは見出しです。予定日、予定工数、進捗率は持たず、配下のLEAFタスクで管理します。"
          parentTasks={parentTasks}
          showInitialProgressNote
          values={{ description, name, parentTaskId, plannedEndDate, plannedHours, plannedStartDate }}
        />

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

const emptyToNull = (value: string): string | null => {
  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? null : trimmedValue;
};

const isValidPlannedHours = (hours: number): boolean =>
  Number.isFinite(hours) &&
  hours >= 0.25 &&
  hours <= 9999.99 &&
  Math.abs(hours * 4 - Math.round(hours * 4)) < 1e-9;
