// 認証付きfetch、共通エラー応答、refresh single-flightを集約するAPIクライアント。
import { accessTokenStore } from "./accessTokenStore";
import { ApiClientError, type ApiErrorResponse } from "./apiTypes";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  isRetry?: boolean;
  skipRefresh?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

export const apiClient = {
  request: <T>(path: string, options: ApiRequestOptions = {}) => request<T>(path, options),
};

const request = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: buildHeaders(options.body),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  if (response.status === 401 && !options.skipRefresh && !options.isRetry) {
    const refreshedAccessToken = await refreshAccessTokenOnce();
    if (refreshedAccessToken !== null) {
      return request<T>(path, { ...options, isRetry: true });
    }
  }

  if (!response.ok) {
    throw new ApiClientError(response.status, await parseErrorResponse(response));
  }

  return response.json() as Promise<T>;
};

const buildHeaders = (body: unknown): HeadersInit => {
  const headers = new Headers();
  headers.set("Accept", "application/json");

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken = accessTokenStore.get();
  if (accessToken !== null) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
};

const refreshAccessTokenOnce = async (): Promise<string | null> => {
  if (refreshPromise === null) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const response = await request<{ accessToken: string }>("/api/auth/refresh", {
      method: "POST",
      skipRefresh: true,
    });
    accessTokenStore.set(response.accessToken);
    return response.accessToken;
  } catch {
    accessTokenStore.set(null);
    return null;
  }
};

const parseErrorResponse = async (response: Response): Promise<ApiErrorResponse> => {
  try {
    const body = (await response.json()) as Partial<ApiErrorResponse>;
    return {
      code: body.code ?? `HTTP_${response.status}`,
      message: body.message ?? "エラーが発生しました。",
      details: Array.isArray(body.details) ? body.details : [],
    };
  } catch {
    return {
      code: `HTTP_${response.status}`,
      message: "エラーが発生しました。",
      details: [],
    };
  }
};
