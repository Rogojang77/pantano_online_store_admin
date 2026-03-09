export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export const ROLES = {
  ADMIN: "admin",
  STORE_MANAGER: "store_manager",
} as const;

export const isAdmin = (role: string) => role === ROLES.ADMIN;
export const isStoreManager = (role: string) => role === ROLES.STORE_MANAGER;
