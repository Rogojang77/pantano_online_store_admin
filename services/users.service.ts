import api from "./api";
import type { PaginatedResponse } from "@/types/api";

export interface UserListItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt?: string;
  roleId: string;
  role: { id: string; name: string; slug: string };
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleId: string;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleId?: string;
  isActive?: boolean;
}

export const usersService = {
  getList: (params?: { page?: number; limit?: number; search?: string }) =>
    api
      .get<PaginatedResponse<UserListItem>>("/users", { params })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<UserListItem>(`/users/${id}`).then((r) => r.data),

  create: (payload: CreateUserPayload) =>
    api.post<UserListItem>("/users", payload).then((r) => r.data),

  update: (id: string, payload: UpdateUserPayload) =>
    api.patch<UserListItem>(`/users/${id}`, payload).then((r) => r.data),

  resetPassword: (id: string, newPassword: string) =>
    api
      .post<{ message: string }>(`/users/${id}/reset-password`, { newPassword })
      .then((r) => r.data),
};
