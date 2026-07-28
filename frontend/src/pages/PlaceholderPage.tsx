// 後続スライスで実装するMVP1画面のルートだけを先に確保する。
import { Link } from "react-router-dom";

import { Panel, PanelHeader } from "../shared/components/Panel";

type PlaceholderPageProps = {
  screenId: string;
  title: string;
};

export const PlaceholderPage = ({ screenId, title }: PlaceholderPageProps) => (
  <main className="app-page">
    <Panel className="state-panel">
      <PanelHeader eyebrow={screenId} title={title} titleAs="h1" />
      <p>この画面は次以降のfrontendスライスで実装します。</p>
      <Link className="primary-link" to="/projects">
        プロジェクト一覧へ戻る
      </Link>
    </Panel>
  </main>
);
