// AI03で選択した下書きタスクの種別、親、予定、工数、削除操作を編集する。
import { useState } from "react";

import type { AiPlanDraftTask, AiDraftTaskType } from "./aiPlanTypes";

type AiPlanTaskEditPanelProps = {
  fallbackSourceKey: string | undefined;
  hasChildren: boolean;
  parentTasks: AiPlanDraftTask[];
  task: AiPlanDraftTask;
  onClose: () => void;
  onDelete: () => void;
  onSave: (task: AiPlanDraftTask) => void;
};

export const AiPlanTaskEditPanel = ({
  fallbackSourceKey,
  hasChildren,
  parentTasks,
  task,
  onClose,
  onDelete,
  onSave,
}: AiPlanTaskEditPanelProps) => {
  const [taskType, setTaskType] = useState<AiDraftTaskType>(task.taskType);
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description);
  const [parentTemporaryKey, setParentTemporaryKey] = useState(task.parentTemporaryKey ?? "");
  const [plannedStartDate, setPlannedStartDate] = useState(task.plannedStartDate ?? "");
  const [plannedEndDate, setPlannedEndDate] = useState(task.plannedEndDate ?? "");
  const [plannedHours, setPlannedHours] = useState(task.plannedHours === null ? "" : String(task.plannedHours));
  const [fieldError, setFieldError] = useState("");

  const handleSave = () => {
    if (name.trim() === "") {
      setFieldError("タスク名を入力してください。");
      return;
    }
    if (taskType === "PARENT") {
      onSave({
        ...task,
        taskType,
        name: name.trim(),
        description,
        parentTemporaryKey: null,
        plannedStartDate: null,
        plannedEndDate: null,
        plannedHours: null,
        sourceTemporaryKeys: [],
      });
      return;
    }
    const sourceTemporaryKeys = task.sourceTemporaryKeys.length > 0
      ? task.sourceTemporaryKeys
      : fallbackSourceKey === undefined ? [] : [fallbackSourceKey];
    if (parentTemporaryKey === "" || plannedStartDate === "" || plannedEndDate === "" || plannedHours === "" || sourceTemporaryKeys.length === 0) {
      setFieldError("親タスク、予定期間、予定工数を入力してください。");
      return;
    }
    onSave({
      ...task,
      taskType,
      name: name.trim(),
      description,
      parentTemporaryKey,
      plannedStartDate,
      plannedEndDate,
      plannedHours: Number(plannedHours),
      sourceTemporaryKeys,
    });
  };

  return (
    <aside aria-label={`${task.name}を編集`} className="ai-task-edit-panel">
      <div className="panel-header">
        <h2>タスクを編集</h2>
        <button aria-label="編集パネルを閉じる" className="text-button" onClick={onClose} type="button">閉じる</button>
      </div>
      <label>タスク名<input maxLength={100} onChange={(event) => setName(event.target.value)} value={name} /></label>
      <label>説明<textarea maxLength={5000} onChange={(event) => setDescription(event.target.value)} value={description} /></label>
      <label>タスク種別<select onChange={(event) => setTaskType(event.target.value as AiDraftTaskType)} value={taskType}><option value="PARENT">親タスク（見出し）</option><option value="LEAF">タスク（予定・実績あり）</option></select></label>
      {taskType === "LEAF" ? (
        <>
          <label>親タスク<select onChange={(event) => setParentTemporaryKey(event.target.value)} value={parentTemporaryKey}><option value="">選択してください</option>{parentTasks.filter((parent) => parent.temporaryKey !== task.temporaryKey).map((parent) => <option key={parent.temporaryKey} value={parent.temporaryKey}>{parent.name}</option>)}</select></label>
          <label>予定開始日<input onChange={(event) => setPlannedStartDate(event.target.value)} type="date" value={plannedStartDate} /></label>
          <label>予定終了日<input onChange={(event) => setPlannedEndDate(event.target.value)} type="date" value={plannedEndDate} /></label>
          <label>予定工数<input min="0.25" onChange={(event) => setPlannedHours(event.target.value)} step="0.25" type="number" value={plannedHours} /></label>
        </>
      ) : <p className="section-description">親タスクは見出しとして扱い、予定日と工数は配下タスクで管理します。</p>}
      {task.taskType === "PARENT" && taskType === "LEAF" && hasChildren && <p className="warning-note">配下タスクがあるため、この変更はサーバー検証で拒否される場合があります。</p>}
      {fieldError !== "" && <p className="field-error" role="alert">{fieldError}</p>}
      <div className="ai-task-edit-actions"><button className="primary-button" onClick={handleSave} type="button">保存</button><button className="secondary-button danger-text" onClick={onDelete} type="button">削除</button></div>
    </aside>
  );
};
