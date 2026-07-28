// プロジェクト配下画面の読み込み・未検出・再試行状態を共通表示する。
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { messageOf } from "../../shared/api/errorMessages";
import { ErrorPanel } from "../../shared/components/ErrorPanel";
import { LoadingPanel } from "../../shared/components/LoadingPanel";

type ProjectPageGateProps<Data> = {
  children: (data: Data) => ReactNode;
  data: Data | undefined;
  error: unknown;
  isLoading: boolean;
  isProjectNotFound: boolean;
  loadingMessage: string;
  onRetry: () => void;
};

export const ProjectPageGate = <Data,>({
  children,
  data,
  error,
  isLoading,
  isProjectNotFound,
  loadingMessage,
  onRetry,
}: ProjectPageGateProps<Data>) => {
  if (isLoading) {
    return <LoadingPanel message={loadingMessage} />;
  }

  if (isProjectNotFound) {
    return (
      <main className="app-page">
        <ErrorPanel message="対象のプロジェクトは存在しません。" />
        <Link className="primary-link" to="/projects">
          プロジェクト一覧へ戻る
        </Link>
      </main>
    );
  }

  if (data === undefined) {
    return (
      <main className="app-page">
        <ErrorPanel message={messageOf(error)} onRetry={onRetry} />
      </main>
    );
  }

  return children(data);
};
