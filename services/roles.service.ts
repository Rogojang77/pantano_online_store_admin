import api from "./api";

export interface RoleItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionItem {
  id: string;
  name: string;
  slug: string;
  resource: string;
  action: string;
  description: string | null;
}

export interface RoleWithPermissions extends RoleItem {
  rolePermissions: Array<{ permissionId: string; permission: PermissionItem }>;
}

export const rolesService = {
  getRoles: () => api.get<RoleItem[]>("/roles").then((r) => r.data),

  getPermissions: () =>
    api.get<PermissionItem[]>("/roles/permissions").then((r) => r.data),

  getRoleById: (id: string) =>
    api.get<RoleWithPermissions>(`/roles/${id}`).then((r) => r.data),

  updatePermissions: (roleId: string, permissionIds: string[]) =>
    api
      .patch<RoleWithPermissions>(`/roles/${roleId}/permissions`, {
        permissionIds,
      })
      .then((r) => r.data),
};
