// AU02 ログイン画面。認証成功時にプロジェクト一覧へ遷移する。
import { type SubmitEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useLogin } from "../features/auth/useAuth";
import { FieldError } from "../shared/components/FieldError";
import { AuthLayout } from "../shared/components/AuthLayout";
import { PasswordInput } from "../shared/components/PasswordInput";
import { fieldMessageOf, messageOf } from "../shared/api/errorMessages";

type LoginLocationState = {
  from?: { pathname?: string };
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          navigate(resolveRedirectPath(location.state), { replace: true });
        },
      },
    );
  };

  return (
    <AuthLayout
      description="学習計画、WBS、学習記録をひとつのプロジェクトとして管理します。"
      screenId="AU02"
      title="ログイン"
    >
      <form className="form" onSubmit={handleSubmit}>
        <label>
          メールアドレス
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
          <FieldError message={fieldMessageOf(login.error, "email")} />
        </label>
        <div className="form-field">
          <label htmlFor="login-password">パスワード</label>
          <PasswordInput
            autoComplete="current-password"
            id="login-password"
            onChange={(event) => setPassword(event.target.value)}
            value={password}
          />
          <FieldError message={fieldMessageOf(login.error, "password")} />
        </div>
        {login.isError && <p className="form-message error-text">{messageOf(login.error)}</p>}
        <button className="primary-button" disabled={login.isPending} type="submit">
          ログイン
        </button>
      </form>
      <p className="form-footer">
        アカウント未作成の場合は <Link to="/signup">新規登録</Link>
      </p>
    </AuthLayout>
  );
};

const resolveRedirectPath = (state: unknown): string => {
  const locationState = state as LoginLocationState | null;
  return locationState?.from?.pathname ?? "/projects";
};
