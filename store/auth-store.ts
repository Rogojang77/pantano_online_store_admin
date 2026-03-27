"use client";

import { create } from "zustand";
import type { UserProfile, TokenResponse } from "@/types/auth";

interface AuthState {
  user: UserProfile | null;
  setAuth: (data: TokenResponse) => void;
  setProfile: (user: UserProfile) => void;
  clearAuth: () => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  setAuth: (data) =>
    set({
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
  clearAuth: () => set({ user: null }),
  logout: () => set({ user: null }),
  isAuthenticated: () => !!get().user,
}));
