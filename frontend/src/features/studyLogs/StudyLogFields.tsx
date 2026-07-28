// 学習記録の登録・編集で共通する学習日、時間、メモの入力欄を表示する。
import { FieldError } from "../../shared/components/FieldError";
import { currentJstDate } from "../../shared/time/jstDate";

import type { StudyLogFormValues } from "./studyLogRequest";

export type StudyLogFieldName = "memo" | "studyDate" | "studyHours";

type StudyLogFieldsProps = {
  fieldErrors: Partial<Record<StudyLogFieldName, string>>;
  onChange: (field: StudyLogFieldName, value: string) => void;
  values: Pick<StudyLogFormValues, StudyLogFieldName>;
};

export const StudyLogFields = ({ fieldErrors, onChange, values }: StudyLogFieldsProps) => (
  <>
    <label>
      学習日 <RequiredMark />
      <input
        max={currentJstDate()}
        onChange={(event) => onChange("studyDate", event.target.value)}
        type="date"
        value={values.studyDate}
      />
      <FieldError message={fieldErrors.studyDate} />
    </label>

    <label>
      学習時間 <RequiredMark />
      <div className="input-with-unit">
        <input
          inputMode="decimal"
          max="9999.99"
          min="0.25"
          onChange={(event) => onChange("studyHours", event.target.value)}
          step="0.25"
          type="number"
          value={values.studyHours}
        />
        <span>時間</span>
      </div>
      <FieldError message={fieldErrors.studyHours} />
    </label>

    <label>
      メモ（任意）
      <textarea maxLength={5000} onChange={(event) => onChange("memo", event.target.value)} rows={4} value={values.memo} />
      <FieldError message={fieldErrors.memo} />
    </label>
  </>
);

const RequiredMark = () => <span aria-label="必須" className="required-mark">*</span>;
