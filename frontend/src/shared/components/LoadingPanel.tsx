// 読み込み中の画面領域を一貫した見た目で表示する。
type LoadingPanelProps = {
  message?: string;
};

export const LoadingPanel = ({ message = "読み込んでいます。" }: LoadingPanelProps) => (
  <section className="panel state-panel" aria-live="polite">
    <p>{message}</p>
  </section>
);
