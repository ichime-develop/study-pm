// 読み込み起点のエラーを領域内に表示する。
type ErrorPanelProps = {
  message: string;
  onRetry?: () => void;
};

export const ErrorPanel = ({ message, onRetry }: ErrorPanelProps) => (
  <section className="panel state-panel error-panel" role="alert">
    <p>{message}</p>
    {onRetry !== undefined && (
      <button className="secondary-button" onClick={onRetry} type="button">
        再読み込み
      </button>
    )}
  </section>
);
