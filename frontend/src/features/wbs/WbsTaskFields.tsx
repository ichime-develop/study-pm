// WBSタスク作成・編集で共通する基本情報と計画情報の入力欄を表示する。
import { FieldError } from "../../shared/components/FieldError";

import type { WbsTask } from "./wbsTypes";

export type WbsTaskFieldName =
  | "description"
  | "name"
  | "parentTaskId"
  | "plannedEndDate"
  | "plannedHours"
  | "plannedStartDate";

export type WbsTaskFieldValues = Record<WbsTaskFieldName, string>;

type WbsTaskFieldsProps = {
  descriptionRows: number;
  fieldErrors: Partial<Record<WbsTaskFieldName, string>>;
  isParent: boolean;
  onChange: (field: WbsTaskFieldName, value: string) => void;
  parentTaskEmptyLabel: string;
  parentTaskNote: string;
  parentTasks: WbsTask[];
  showInitialProgressNote: boolean;
  values: WbsTaskFieldValues;
};

export const WbsTaskFields = ({
  descriptionRows,
  fieldErrors,
  isParent,
  onChange,
  parentTaskEmptyLabel,
  parentTaskNote,
  parentTasks,
  showInitialProgressNote,
  values,
}: WbsTaskFieldsProps) => (
  <>
    <label>
      <span className="wbs-field-label">
        {isParent ? "親タスク名" : "タスク名"} <RequiredMark />
      </span>
      <input maxLength={100} onChange={(event) => onChange("name", event.target.value)} type="text" value={values.name} />
      <FieldError message={fieldErrors.name} />
    </label>

    <label>
      説明（任意）
      <textarea
        maxLength={5000}
        onChange={(event) => onChange("description", event.target.value)}
        rows={descriptionRows}
        value={values.description}
      />
      <FieldError message={fieldErrors.description} />
    </label>

    {isParent ? (
      <p className="status-note">{parentTaskNote}</p>
    ) : (
      <>
        <label>
          親タスク（任意）
          <select onChange={(event) => onChange("parentTaskId", event.target.value)} value={values.parentTaskId}>
            <option value="">{parentTaskEmptyLabel}</option>
            {parentTasks.map((parentTask) => (
              <option key={parentTask.wbsTaskId} value={parentTask.wbsTaskId}>
                {parentTask.name}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.parentTaskId} />
        </label>

        <div className="form-two-columns">
          <label>
            予定開始日（任意）
            <input
              onChange={(event) => onChange("plannedStartDate", event.target.value)}
              type="date"
              value={values.plannedStartDate}
            />
          </label>
          <label>
            予定終了日（任意）
            <input
              onChange={(event) => onChange("plannedEndDate", event.target.value)}
              type="date"
              value={values.plannedEndDate}
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
              onChange={(event) => onChange("plannedHours", event.target.value)}
              step="0.25"
              type="number"
              value={values.plannedHours}
            />
            <span>時間</span>
          </div>
          <FieldError message={fieldErrors.plannedHours} />
        </label>
        {showInitialProgressNote && <p className="field-note">進捗率は0%で作成されます。</p>}
      </>
    )}
  </>
);

const RequiredMark = () => <span aria-label="必須" className="required-mark">*</span>;
