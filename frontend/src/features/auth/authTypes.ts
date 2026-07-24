// 認証APIが返すアカウントと認証結果を表す。
export type Account = {
  accountId: string;
  email: string;
  displayName: string;
};

export type AuthResponse = {
  account: Account;
  accessToken: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type SignupRequest = {
  email: string;
  password: string;
  displayName: string;
};
