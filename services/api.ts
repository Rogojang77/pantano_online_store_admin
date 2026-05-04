import axios, { type AxiosError } from "axios";
import { API_BASE_URL } from "@/lib/constants";
import { useAuthStore } from "@/store/auth-store";
import type { ApiError } from "@/types/api";

const REQUEST_ID_HEADER = "x-request-id";

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // Let the browser set Content-Type with boundary for FormData (multipart)
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  config.headers[REQUEST_ID_HEADER] = String(config.headers[REQUEST_ID_HEADER] ?? createRequestId());
  return config;
});

api.interceptors.response.use(
  (res) => {
    const responseRequestId = res.headers?.[REQUEST_ID_HEADER] as string | undefined;
    if (responseRequestId && res.config?.headers) {
      res.config.headers[REQUEST_ID_HEADER] = responseRequestId;
    }
    return res;
  },
  (err: AxiosError<ApiError>) => {
    const status = err.response?.status;
    const responseRequestId =
      (err.response?.headers?.[REQUEST_ID_HEADER] as string | undefined) ??
      (err.response?.data as { requestId?: string } | undefined)?.requestId;
    if (responseRequestId && err.response?.data && typeof err.response.data === "object") {
      (err.response.data as ApiError & { requestId?: string }).requestId = responseRequestId;
    }
    const isLoginRequest = err.config?.url?.includes("/auth/login");
    if (status === 401 && !isLoginRequest) {
      useAuthStore.getState().clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
