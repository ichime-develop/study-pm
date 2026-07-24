// ログイン後画面の共通ヘッダーとログアウト導線を表示する。
import type { Account } from "../../features/auth/authTypes";
import { useLogout } from "../../features/auth/useAuth";

type AppHeaderProps = {
  account: Account;
  title: string;
};

export const AppHeader = ({ account, title }: AppHeaderProps) => {
  const logout = useLogout();

  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Study PM</p>
        <h1>{title}</h1>
      </div>
      <div className="header-account">
        <span>{account.displayName}</span>
        <button className="secondary-button" disabled={logout.isPending} onClick={() => logout.mutate()} type="button">
          ログアウト
        </button>
      </div>
    </header>
  );
};
