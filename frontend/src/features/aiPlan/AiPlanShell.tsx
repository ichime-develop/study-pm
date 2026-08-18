// AI作成フローで共通する認証済みヘッダー、パネル幅、3段階ステッパーを提供する。
import type { ReactNode } from "react";

import { useCurrentAccount, useLogout } from "../auth/useAuth";
import { AppHeader } from "../../shared/components/AppHeader";
import { FlowStepper } from "../../shared/components/CM03_FlowStepper";
import { LoadingPanel } from "../../shared/components/LoadingPanel";

type AiPlanShellProps = {
  children: ReactNode;
  currentStep: 1 | 2 | 3;
  title: string;
};

const steps = ["作成方法", "条件・教材", "WBS下書き"];

export const AiPlanShell = ({ children, currentStep, title }: AiPlanShellProps) => {
  const accountQuery = useCurrentAccount();
  const logout = useLogout();

  if (accountQuery.isLoading || accountQuery.data === undefined) {
    return <LoadingPanel message="アカウント情報を読み込んでいます。" />;
  }

  return (
    <main className="app-page ai-plan-page">
      <AppHeader
        account={accountQuery.data}
        isLoggingOut={logout.isPending}
        onLogout={() => logout.mutate()}
        title={title}
      />
      <FlowStepper currentStep={currentStep} steps={steps} />
      {children}
    </main>
  );
};
