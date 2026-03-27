import api from "./api";
import type { UserProfile } from "@/types/auth";
import type { TokenResponse } from "@/types/auth";

export const authService = {
  login: (email: string, password: string) =>
    api.post<TokenResponse>("/auth/login", { email, password }).then((r) => r.data),

  getProfile: () =>
    api.get<UserProfile>("/auth/profile").then((r) => r.data),

  logout: () =>
    api.post<{ message: string }>("/auth/logout").then((r) => r.data),
};
