// WBSで選択したLEAFタスクへ学習記録を登録し、保存後にタスク詳細へ戻す。
import { type SubmitEvent, useState } from "react";

import { fieldMessageOf, messageOf } from "../../shared/api/errorMessages";
import { FieldError } from "../../shared/components/FieldError";
import { useCreateStudyLog } from "./useStudyLogs";
import type { StudyLogCreateRequest } from "./studyLogTypes";

type StudyLogCreatePanelProps = {
  onCancel: () => void;
  onCreated: () => void;
  projectId: string;
  taskId: string;
  taskName: string;
};

export const StudyLogCreatePanel = ({ onCancel, onCreated, projectId, taskId, taskName }: StudyLogCreatePanelProps) => {
  const createStudyLog = useCreateStudyLog(projectId);
  const [studyDate, setStudyDate] = useState(currentJstDate());
  const [studyHours, setStudyHours] = useState("");
  const [memo, setMemo] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const request = buildStudyLogCreateRequest({ memo, setClientError, studyDate, studyHours, taskId });
    if (request === undefined) {
      return;
    }
    createStudyLog.mutate(request, { onSuccess: onCreated });
  };

  const handleStudyDateChange = (value: string) => {
    setClientError(null);
    setStudyDate(value);
  };

  const handleStudyHoursChange = (value: string) => {
    setClientError(null);
    setStudyHours(value);
  };

  const handleMemoChange = (value: string) => {
    setClientError(null);
    setMemo(value);
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
          <input max={currentJstDate()} onChange={(event) => handleStudyDateChange(event.target.value)} type="date" value={studyDate} />
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
              value={studyHours}
            />
            <span>時間</span>
          </div>
          <FieldError message={fieldMessageOf(createStudyLog.error, "studyHours")} />
        </label>

        <label>
          メモ（任意）
          <textarea maxLength={5000} onChange={(event) => handleMemoChange(event.target.value)} rows={4} value={memo} />
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

type BuildStudyLogCreateRequestInput = {
  memo: string;
  setClientError: (message: string | null) => void;
  studyDate: string;
  studyHours: string;
  taskId: string;
};

const buildStudyLogCreateRequest = ({
  memo,
  setClientError,
  studyDate,
  studyHours,
  taskId,
}: BuildStudyLogCreateRequestInput): StudyLogCreateRequest | undefined => {
  if (studyDate.length === 0) {
    setClientError("学習日を入力してください。");
    return undefined;
  }
  if (studyDate > currentJstDate()) {
    setClientError("未来日の学習記録は登録できません。");
    return undefined;
  }

  const parsedStudyHours = Number(studyHours);
  if (!isValidStudyHours(parsedStudyHours)) {
    setClientError("学習時間は0.25時間以上9999.99時間以下の0.25時間刻みで入力してください。");
    return undefined;
  }

  return {
    wbsTaskId: taskId,
    studyDate,
    studyHours: parsedStudyHours,
    memo: emptyToNull(memo),
  };
};

const currentJstDate = (): string => {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Tokyo",
    year: "numeric",
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((parts, part) => {
      parts[part.type] = part.value;
      return parts;
    }, {});
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
};

const emptyToNull = (value: string): string | null => {
  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? null : trimmedValue;
};

const isValidStudyHours = (hours: number): boolean =>
  Number.isFinite(hours) &&
  hours >= 0.25 &&
  hours <= 9999.99 &&
  Math.abs(hours * 4 - Math.round(hours * 4)) < 1e-9;

const RequiredMark = () => <span aria-label="必須" className="required-mark">*</span>;
