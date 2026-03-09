export type RoleSlug = "admin" | "store_manager";

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  role: {
    id: string;
    name: string;
    slug: RoleSlug;
  };
}

export interface TokenResponse {
  accessToken: string;
  /** Token lifetime: number of seconds (preferred) or string e.g. '7d' */
  expiresIn: number | string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}
