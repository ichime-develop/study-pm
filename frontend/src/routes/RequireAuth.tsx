// 認証済みAPI画面だけを表示し、未認証ならログイン画面へ戻す。
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LoadingPanel } from "../shared/components/LoadingPanel";
import { useCurrentAccount } from "../features/auth/useAuth";

export const RequireAuth = () => {
  const location = useLocation();
  const accountQuery = useCurrentAccount();

  if (accountQuery.isPending) {
    return <LoadingPanel message="セッションを確認しています。" />;
  }

  if (accountQuery.isError) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <Outlet />;
};
