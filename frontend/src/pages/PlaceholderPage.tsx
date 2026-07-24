// 後続スライスで実装するMVP1画面のルートだけを先に確保する。
import { Link } from "react-router-dom";

type PlaceholderPageProps = {
  screenId: string;
  title: string;
};

export const PlaceholderPage = ({ screenId, title }: PlaceholderPageProps) => (
  <main className="app-page">
    <section className="panel state-panel">
      <p className="eyebrow">{screenId}</p>
      <h1>{title}</h1>
      <p>この画面は次以降のfrontendスライスで実装します。</p>
      <Link className="primary-link" to="/projects">
        プロジェクト一覧へ戻る
      </Link>
    </section>
  </main>
);
