// AU01 アカウント登録画面。登録成功時にプロジェクト一覧へ遷移する。
import { type SubmitEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useSignup } from "../features/auth/useAuth";
import { fieldMessageOf, messageOf } from "../shared/api/errorMessages";
import { AuthLayout } from "../shared/components/AuthLayout";
import { FieldError } from "../shared/components/FieldError";

export const SignupPage = () => {
  const navigate = useNavigate();
  const signup = useSignup();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    signup.mutate(
      { displayName, email, password },
      {
        onSuccess: () => navigate("/projects", { replace: true }),
      },
    );
  };

  return (
    <AuthLayout
      description="まずは学習管理用のアカウントを作成します。"
      screenId="AU01"
      title="アカウント登録"
    >
      <form className="form" onSubmit={handleSubmit}>
        <label>
          表示名
          <input
            autoComplete="name"
            onChange={(event) => setDisplayName(event.target.value)}
            type="text"
            value={displayName}
          />
          <FieldError message={fieldMessageOf(signup.error, "displayName")} />
        </label>
        <label>
          メールアドレス
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
          <FieldError message={fieldMessageOf(signup.error, "email")} />
        </label>
        <label>
          パスワード
          <input
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
          <FieldError message={fieldMessageOf(signup.error, "password")} />
        </label>
        {signup.isError && <p className="form-message error-text">{messageOf(signup.error)}</p>}
        <button className="primary-button" disabled={signup.isPending} type="submit">
          登録する
        </button>
      </form>
      <p className="form-footer">
        すでにアカウントがある場合は <Link to="/login">ログイン</Link>
      </p>
    </AuthLayout>
  );
};
