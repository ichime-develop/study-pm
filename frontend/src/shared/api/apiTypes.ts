// backendの共通APIレスポンス契約をTypeScriptで表す。
export type ApiErrorDetail = {
  field: string;
  message: string;
};

export type ApiErrorResponse = {
  code: string;
  message: string;
  details: ApiErrorDetail[];
};

export type PageResponse = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly body: ApiErrorResponse;

  constructor(status: number, body: ApiErrorResponse) {
    super(body.message);
    this.name = "ApiClientError";
    this.status = status;
    this.body = body;
  }
}

export const isApiClientError = (error: unknown): error is ApiClientError =>
  error instanceof ApiClientError;
