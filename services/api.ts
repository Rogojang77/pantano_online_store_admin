import axios, { type AxiosError } from "axios";
import { API_BASE_URL } from "@/lib/constants";
import { useAuthStore } from "@/store/auth-store";
import type { ApiError } from "@/types/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Let the browser set Content-Type with boundary for FormData (multipart)
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<ApiError>) => {
    const status = err.response?.status;
    const isLoginRequest = err.config?.url?.includes("/auth/login");
    if (status === 401 && !isLoginRequest) {
      useAuthStore.getState().logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    if (status === 403) {
      if (typeof window !== "undefined") {
        window.location.href = "/dashboard";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
