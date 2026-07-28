// ログイン後画面の共通ヘッダーと、呼び出し元が渡すログアウト導線を表示する。

type AppHeaderProps = {
  account: {
    displayName: string;
  };
  isLoggingOut: boolean;
  onLogout: () => void;
  title: string;
};

export const AppHeader = ({ account, isLoggingOut, onLogout, title }: AppHeaderProps) => {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Study PM</p>
        <h1>{title}</h1>
      </div>
      <div className="header-account">
        <span>{account.displayName}</span>
        <button className="secondary-button" disabled={isLoggingOut} onClick={onLogout} type="button">
          ログアウト
        </button>
      </div>
    </header>
  );
};
