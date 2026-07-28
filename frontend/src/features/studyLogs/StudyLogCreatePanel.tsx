// WBSで選択したLEAFタスクへ学習記録を登録し、保存後にタスク詳細へ戻す。
import { type SubmitEvent, useState } from "react";

import { fieldMessageOf, messageOf } from "../../shared/api/errorMessages";
import { FieldError } from "../../shared/components/FieldError";
import { currentJstDate } from "../../shared/time/jstDate";
import { useCreateStudyLog } from "./useStudyLogs";
import { buildStudyLogRequest, newStudyLogFormValues } from "./studyLogRequest";

type StudyLogCreatePanelProps = {
  onCancel: () => void;
  onCreated: () => void;
  projectId: string;
  taskId: string;
  taskName: string;
};

export const StudyLogCreatePanel = ({ onCancel, onCreated, projectId, taskId, taskName }: StudyLogCreatePanelProps) => {
  const createStudyLog = useCreateStudyLog(projectId);
  const [values, setValues] = useState(() => newStudyLogFormValues(taskId));
  const [clientError, setClientError] = useState<string | null>(null);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = buildStudyLogRequest(values);
    if ("validationMessage" in result) {
      setClientError(result.validationMessage);
      return;
    }
    createStudyLog.mutate(result.request, { onSuccess: onCreated });
  };

  const handleStudyDateChange = (value: string) => {
    setClientError(null);
    setValues((current) => ({ ...current, studyDate: value }));
  };

  const handleStudyHoursChange = (value: string) => {
    setClientError(null);
    setValues((current) => ({ ...current, studyHours: value }));
  };

  const handleMemoChange = (value: string) => {
    setClientError(null);
    setValues((current) => ({ ...current, memo: value }));
  };

  const formError = clientError ?? (createStudyLog.error === null ? undefined : messageOf(createStudyLog.error));

  return (
    <aside className="wbs-task-panel" aria-label={`${taskName}への学習記録を追加`}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">学習記録</p>
          <h2>学習記録を追加</h2>
        </div>
        <button aria-label="学習記録登録をキャンセル" className="secondary-button" onClick={onCancel} type="button">
          キャンセル
        </button>
      </div>

      <form className="form" noValidate onSubmit={handleSubmit}>
        <label>
          対象タスク
          <input disabled type="text" value={taskName} />
          <span className="field-note">WBSから開始した登録では、選択中のLEAFタスクへ記録します。</span>
        </label>

        <label>
          学習日 <RequiredMark />
          <input max={currentJstDate()} onChange={(event) => handleStudyDateChange(event.target.value)} type="date" value={values.studyDate} />
          <FieldError message={fieldMessageOf(createStudyLog.error, "studyDate")} />
        </label>

        <label>
          学習時間 <RequiredMark />
          <div className="input-with-unit">
            <input
              inputMode="decimal"
              max="9999.99"
              min="0.25"
              onChange={(event) => handleStudyHoursChange(event.target.value)}
              step="0.25"
              type="number"
              value={values.studyHours}
            />
            <span>時間</span>
          </div>
          <FieldError message={fieldMessageOf(createStudyLog.error, "studyHours")} />
        </label>

        <label>
          メモ（任意）
          <textarea maxLength={5000} onChange={(event) => handleMemoChange(event.target.value)} rows={4} value={values.memo} />
          <FieldError message={fieldMessageOf(createStudyLog.error, "memo")} />
        </label>

        {formError !== undefined && <p className="error-text form-message">{formError}</p>}
        <div className="button-row">
          <button className="primary-button" disabled={createStudyLog.isPending} type="submit">
            {createStudyLog.isPending ? "登録しています..." : "学習記録を登録"}
          </button>
          <button className="secondary-button" disabled={createStudyLog.isPending} onClick={onCancel} type="button">
            キャンセル
          </button>
        </div>
      </form>
    </aside>
  );
};

const RequiredMark = () => <span aria-label="必須" className="required-mark">*</span>;
