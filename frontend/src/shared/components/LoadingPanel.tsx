// 読み込み中の画面領域を一貫した見た目で表示する。
import { Panel } from "./Panel";

type LoadingPanelProps = {
  message?: string;
};

export const LoadingPanel = ({ message = "読み込んでいます。" }: LoadingPanelProps) => (
  <Panel aria-live="polite" className="state-panel">
    <p>{message}</p>
  </Panel>
);
