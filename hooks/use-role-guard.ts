"use client";

import { useAuthStore } from "@/store/auth-store";
import { ROLES, isAdmin } from "@/lib/constants";

export function useIsAdmin(): boolean {
  const role = useAuthStore((s) => s.user?.role?.slug);
  return isAdmin(role ?? "");
}

export function useCanAccessAdminSection(): boolean {
  return useIsAdmin();
}

export function useRole(): string | undefined {
  return useAuthStore((s) => s.user?.role?.slug);
}

export function useHasRole(...allowed: string[]): boolean {
  const role = useRole();
  return role ? allowed.includes(role) : false;
}

export { ROLES };
