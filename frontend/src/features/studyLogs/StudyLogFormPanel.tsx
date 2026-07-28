// SL01で学習記録を登録・編集する右サイドパネルを提供する。
import { type SubmitEvent, useEffect, useState } from "react";

import { fieldMessageOf, messageOf } from "../../shared/api/errorMessages";
import { FieldError } from "../../shared/components/FieldError";
import type { WbsTask } from "../wbs/wbsTypes";
import { buildStudyLogRequest, newStudyLogFormValues, studyLogFormValuesFor, type StudyLogFormValues } from "./studyLogRequest";
import { StudyLogFields } from "./StudyLogFields";
import type { StudyLog } from "./studyLogTypes";
import { useCreateStudyLog, useUpdateStudyLog } from "./useStudyLogs";

type StudyLogFormPanelProps = {
  leafTasks: WbsTask[];
  onCancel: () => void;
  onDelete: (studyLog: StudyLog) => void;
  onSaved: (message: string) => void;
  projectId: string;
  studyLog?: StudyLog;
};

export const StudyLogFormPanel = ({
  leafTasks,
  onCancel,
  onDelete,
  onSaved,
  projectId,
  studyLog,
}: StudyLogFormPanelProps) => {
  const createStudyLog = useCreateStudyLog(projectId);
  const updateStudyLog = useUpdateStudyLog(projectId);
  const [values, setValues] = useState<StudyLogFormValues>(() => initialValues(studyLog));
  const [clientError, setClientError] = useState<string | null>(null);
  const isEditing = studyLog !== undefined;
  const isPending = createStudyLog.isPending || updateStudyLog.isPending;
  const mutationError = isEditing ? updateStudyLog.error : createStudyLog.error;

  useEffect(() => {
    setClientError(null);
    setValues(initialValues(studyLog));
  }, [studyLog]);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = buildStudyLogRequest(values);
    if ("validationMessage" in result) {
      setClientError(result.validationMessage);
      return;
    }

    if (studyLog === undefined) {
      createStudyLog.mutate(result.request, {
        onSuccess: () => onSaved("学習記録を登録しました。実績工数を更新しました。"),
      });
      return;
    }

    updateStudyLog.mutate(
      { request: result.request, studyLogId: studyLog.studyLogId },
      { onSuccess: () => onSaved("学習記録を更新しました。実績工数を更新しました。") },
    );
  };

  const handleValueChange = <Key extends keyof StudyLogFormValues>(key: Key, value: StudyLogFormValues[Key]) => {
    setClientError(null);
    setValues((current) => ({ ...current, [key]: value }));
  };

  const formError = clientError ?? (mutationError === null ? undefined : messageOf(mutationError));
  const panelTitle = isEditing ? "学習記録を編集" : "学習記録を追加";

  return (
    <aside aria-label={panelTitle} className="study-log-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">学習記録</p>
          <h2>{panelTitle}</h2>
        </div>
        <button aria-label="学習記録の編集をキャンセル" className="secondary-button" onClick={onCancel} type="button">
          キャンセル
        </button>
      </div>

      <form className="form" noValidate onSubmit={handleSubmit}>
        <label>
          対象タスク <RequiredMark />
          <select
            onChange={(event) => handleValueChange("wbsTaskId", event.target.value)}
            value={values.wbsTaskId}
          >
            <option value="">選択してください</option>
            {leafTasks.map((task) => (
              <option key={task.wbsTaskId} value={task.wbsTaskId}>
                {task.name}
              </option>
            ))}
          </select>
          <FieldError message={fieldMessageOf(mutationError, "wbsTaskId")} />
        </label>

        <StudyLogFields
          fieldErrors={{
            memo: fieldMessageOf(mutationError, "memo"),
            studyDate: fieldMessageOf(mutationError, "studyDate"),
            studyHours: fieldMessageOf(mutationError, "studyHours"),
          }}
          onChange={handleValueChange}
          values={values}
        />

        {formError !== undefined && <p className="error-text form-message">{formError}</p>}
        <div className="button-row">
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? "保存しています..." : isEditing ? "変更を保存" : "学習記録を登録"}
          </button>
          {studyLog !== undefined && (
            <button className="danger-button" disabled={isPending} onClick={() => onDelete(studyLog)} type="button">
              削除
            </button>
          )}
        </div>
      </form>
    </aside>
  );
};

const initialValues = (studyLog: StudyLog | undefined): StudyLogFormValues =>
  studyLog === undefined ? newStudyLogFormValues() : studyLogFormValuesFor(studyLog);

const RequiredMark = () => <span aria-label="必須" className="required-mark">*</span>;
