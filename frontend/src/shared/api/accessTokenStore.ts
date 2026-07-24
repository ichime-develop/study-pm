// メモリ上のaccess tokenを保持し、localStorageへ保存しない認証状態を提供する。
type AccessTokenListener = () => void;

let currentAccessToken: string | null = null;
const listeners = new Set<AccessTokenListener>();

export const accessTokenStore = {
  get: () => currentAccessToken,

  set: (accessToken: string | null) => {
    currentAccessToken = accessToken;
    listeners.forEach((listener) => listener());
  },

  subscribe: (listener: AccessTokenListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
