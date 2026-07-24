// フォーム項目の直下にAPI/入力エラーを表示する。
type FieldErrorProps = {
  message?: string;
};

export const FieldError = ({ message }: FieldErrorProps) => {
  if (message === undefined) {
    return null;
  }
  return <p className="field-error">{message}</p>;
};
