import { apiUrl, env } from "../config/env";

export type ApiErrorBody = {
  status?: boolean;
  success?: boolean;
  message?: string;
  error?: string;
};

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const AUTH_STORAGE_KEY = "myhr_auth";

export function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token || null;
  } catch {
    return null;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string | null;
  skipAuth?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, headers, skipAuth, ...rest } = options;
  const authToken = skipAuth ? null : token === undefined ? getStoredToken() : token;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const res = await fetch(apiUrl(path), {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined && !isFormData
        ? { "Content-Type": "application/json" }
        : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const message =
      (typeof data === "object" &&
        data &&
        ("message" in data || "error" in data) &&
        String(
          (data as ApiErrorBody).message || (data as ApiErrorBody).error,
        )) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

async function requestBlob(
  path: string,
  options: RequestOptions = {},
): Promise<{ blob: Blob; filename: string | null }> {
  const { body, token, headers, skipAuth, ...rest } = options;
  const authToken = skipAuth ? null : token === undefined ? getStoredToken() : token;

  const res = await fetch(apiUrl(path), {
    ...rest,
    headers: {
      Accept: "*/*",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await res.json()
      : await res.text();
    const message =
      (typeof data === "object" &&
        data &&
        ("message" in data || "error" in data) &&
        String(
          (data as ApiErrorBody).message || (data as ApiErrorBody).error,
        )) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
  }

  const disposition = res.headers.get("content-disposition") || "";
  const encodedFilename = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plainFilename = disposition.match(/filename="?([^";]+)"?/i)?.[1];

  return {
    blob: await res.blob(),
    filename: encodedFilename
      ? decodeURIComponent(encodedFilename)
      : plainFilename || null,
  };
}

export const api = {
  baseUrl: env.apiBaseUrl,
  storageKey: AUTH_STORAGE_KEY,
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
  download: (path: string, body?: unknown, options?: RequestOptions) =>
    requestBlob(path, { ...options, method: "POST", body }),
  downloadGet: (path: string, options?: RequestOptions) =>
    requestBlob(path, { ...options, method: "GET" }),
};
