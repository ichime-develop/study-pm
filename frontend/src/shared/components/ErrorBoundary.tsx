// フロントエンドの未捕捉例外を画面全体の復旧導線へ変換する。
import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught frontend error", { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="auth-page">
          <section className="auth-card">
            <p className="eyebrow">予期せぬエラー</p>
            <h1>画面を表示できませんでした</h1>
            <p className="form-message">
              再読み込みしても解消しない場合は、ホームへ戻って操作をやり直してください。
            </p>
            <div className="button-row">
              <button className="primary-button" onClick={() => window.location.reload()} type="button">
                再読み込み
              </button>
              <a className="secondary-link" href="/projects">
                ホームへ
              </a>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
