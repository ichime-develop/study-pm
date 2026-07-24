// 認証APIの呼び出しとaccess token更新をまとめる。
import { apiClient } from "../../shared/api/apiClient";
import { accessTokenStore } from "../../shared/api/accessTokenStore";
import type { Account, AuthResponse, LoginRequest, SignupRequest } from "./authTypes";

export const authApi = {
  signup: async (request: SignupRequest): Promise<AuthResponse> => {
    const response = await apiClient.request<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: request,
      skipRefresh: true,
    });
    accessTokenStore.set(response.accessToken);
    return response;
  },

  login: async (request: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: request,
      skipRefresh: true,
    });
    accessTokenStore.set(response.accessToken);
    return response;
  },

  logout: async (): Promise<void> => {
    await apiClient.request<{ result: "OK" }>("/api/auth/logout", { method: "POST" });
    accessTokenStore.set(null);
  },

  me: () => apiClient.request<Account>("/api/me"),
};
