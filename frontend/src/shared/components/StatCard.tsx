import { useId } from "react";

// 一覧上部や概要で使う単一指標カードを表示する。
type StatCardProps = {
  help?: readonly string[];
  label: string;
  value: string;
  helper?: string;
};

export const StatCard = ({ help, label, value, helper }: StatCardProps) => {
  const helpId = useId();

  return (
    <article className="stat-card">
      <span className="stat-card-label">
        {label}
        {help !== undefined && (
          <span className="stat-card-help">
            <button aria-describedby={helpId} aria-label={`${label}の説明`} type="button">?</button>
            <span className="stat-card-help-tooltip" id={helpId} role="tooltip">
              {help.map((line) => <span key={line}>{line}</span>)}
            </span>
          </span>
        )}
      </span>
      <strong>{value}</strong>
      {helper !== undefined && <small>{helper}</small>}
    </article>
  );
};
