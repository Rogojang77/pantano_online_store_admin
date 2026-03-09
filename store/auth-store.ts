"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile, TokenResponse } from "@/types/auth";

/** TokenResponse.expiresIn may be number (seconds) or legacy string (e.g. '7d'). Return ms from now. */
function getExpiresAtMs(expiresIn: number | string): number {
  if (typeof expiresIn === "number") return Date.now() + expiresIn * 1000;
  const match = String(expiresIn).trim().match(/^(\d+)([smhd])$/i);
  if (!match) return Date.now() + 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const ms: Record<string, number> = { s: 1000, m: 60 * 1000, h: 3600 * 1000, d: 86400 * 1000 };
  return Date.now() + n * (ms[unit] ?? 86400 * 1000);
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  expiresAt: number | null;
  setAuth: (data: TokenResponse) => void;
  setProfile: (user: UserProfile) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      expiresAt: null,
      setAuth: (data) =>
        set({
          accessToken: data.accessToken,
          expiresAt: getExpiresAtMs(data.expiresIn),
          user: {
            id: data.user.id,
            email: data.user.email,
            firstName: null,
            lastName: null,
            phone: null,
            isActive: true,
            lastLoginAt: null,
            createdAt: "",
            updatedAt: "",
            role: {
              id: "",
              name: data.user.role === "admin" ? "Admin" : "Store Manager",
              slug: data.user.role as "admin" | "store_manager",
            },
          },
        }),
      setProfile: (user) => set({ user }),
      logout: () =>
        set({ user: null, accessToken: null, expiresAt: null }),
      isAuthenticated: () => {
        const { accessToken, expiresAt } = get();
        return !!accessToken && !!expiresAt && Date.now() < expiresAt;
      },
    }),
    { name: "pantano-auth" }
  )
);
