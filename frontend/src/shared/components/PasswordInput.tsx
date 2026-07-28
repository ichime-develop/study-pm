// 認証画面でパスワードの表示状態を切り替える入力部品。
import { type ChangeEvent, useState } from "react";

type PasswordInputProps = {
  autoComplete: "current-password" | "new-password";
  id: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value: string;
};

export const PasswordInput = ({ autoComplete, id, onChange, value }: PasswordInputProps) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const toggleLabel = isPasswordVisible ? "パスワードを隠す" : "パスワードを表示";

  return (
    <div className="password-input">
      <input
        autoComplete={autoComplete}
        id={id}
        onChange={onChange}
        type={isPasswordVisible ? "text" : "password"}
        value={value}
      />
      <button
        aria-label={toggleLabel}
        aria-pressed={isPasswordVisible}
        className="password-toggle"
        onClick={() => setIsPasswordVisible((current) => !current)}
        type="button"
      >
        {isPasswordVisible ? "隠す" : "表示"}
      </button>
    </div>
  );
};
