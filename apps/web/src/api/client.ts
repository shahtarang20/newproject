import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import type { ApiFailure, ApiSuccess, PaginationMeta } from '@vastra/shared';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const baseURL: string = import.meta.env.VITE_API_URL || '/api';

// ---- in-memory access token (never persisted) -------------------------------
let accessToken: string | null = null;
export const getAccessToken = (): string | null => accessToken;
export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

let onSessionExpired: (() => void) | null = null;
/** The auth store registers a handler invoked when refresh fails (user must sign in again). */
export const setSessionExpiredHandler = (fn: (() => void) | null): void => {
  onSessionExpired = fn;
};

/** Optional header for super admins impersonating a shop. */
let impersonatedShopId: string | null = null;
export const setImpersonatedShopId = (id: string | null): void => {
  impersonatedShopId = id;
};

export const http = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});

http.interceptors.request.use((config) => {
  if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`);
  if (impersonatedShopId) config.headers.set('X-Shop-Id', impersonatedShopId);
  return config;
});

// ---- single-flight refresh ---------------------------------------------------
let refreshPromise: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<ApiSuccess<{ accessToken: string }>>(`${baseURL}/auth/refresh`, null, { withCredentials: true, timeout: 15_000 })
      .then((res) => {
        accessToken = res.data.data.accessToken;
        return accessToken;
      })
      .catch(() => {
        accessToken = null;
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const res = (error as AxiosError<ApiFailure>).response;
    if (!res) {
      return new ApiError(0, error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR', 'Network error. Please check your connection.');
    }
    const e = res.data?.error;
    return new ApiError(res.status, e?.code ?? 'INTERNAL_ERROR', e?.message ?? res.statusText ?? 'Request failed', e?.details);
  }
  return new ApiError(0, 'UNKNOWN', error instanceof Error ? error.message : 'Unknown error');
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiFailure>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;
    const skip = !original || NO_REFRESH_PATHS.some((p) => original.url?.includes(p));

    if (status === 401 && !skip && !original._retry && (code === 'TOKEN_EXPIRED' || code === 'AUTH_REQUIRED')) {
      original._retry = true;
      const token = await refreshAccessToken(); // concurrent 401s share one refresh (queue)
      if (token) {
        original.headers.set('Authorization', `Bearer ${token}`);
        return http(original);
      }
      onSessionExpired?.();
    }
    return Promise.reject(toApiError(error));
  },
);

export interface Unwrapped<T> {
  data: T;
  meta?: PaginationMeta;
  message?: string;
}

async function unwrap<T>(p: Promise<{ data: ApiSuccess<T> }>): Promise<Unwrapped<T>> {
  const res = await p;
  const body = res.data;
  // 204 / empty body tolerance
  if (!body || typeof body !== 'object') return { data: undefined as T };
  return { data: body.data, meta: body.meta, message: body.message };
}

/** Typed helpers that unwrap the `{success,data,message,meta}` envelope. */
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => unwrap<T>(http.get(url, config)),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => unwrap<T>(http.post(url, body, config)),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => unwrap<T>(http.put(url, body, config)),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => unwrap<T>(http.patch(url, body, config)),
  delete: <T = void>(url: string, config?: AxiosRequestConfig) => unwrap<T>(http.delete(url, config)),
  /** multipart upload with progress callback. */
  upload: <T>(url: string, form: FormData, onProgress?: (pct: number) => void, config?: AxiosRequestConfig) =>
    unwrap<T>(
      http.post(url, form, {
        ...config,
        headers: { 'Content-Type': 'multipart/form-data', ...(config?.headers ?? {}) },
        onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      }),
    ),
};
