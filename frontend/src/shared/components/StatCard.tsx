// 一覧上部や概要で使う単一指標カードを表示する。
type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
};

export const StatCard = ({ label, value, helper }: StatCardProps) => (
  <article className="stat-card">
    <span>{label}</span>
    <strong>{value}</strong>
    {helper !== undefined && <small>{helper}</small>}
  </article>
);
