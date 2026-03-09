import api from "./api";

export interface DashboardStats {
  products: number;
  orders: number;
  ordersPending: number;
  users: number;
  categories: number;
}

export const adminService = {
  getDashboardStats: () =>
    api.get<DashboardStats>("/admin/dashboard").then((r) => r.data),
};
