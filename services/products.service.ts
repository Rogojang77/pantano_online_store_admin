import api from "./api";
import type { PaginatedResponse } from "@/types/api";

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  status: string;
  categoryId: string | null;
  brandId: string | null;
  createdAt: string;
}

export const productsService = {
  getList: (params?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    brandId?: string;
    status?: string;
  }) =>
    api
      .get<PaginatedResponse<ProductListItem>>("/products", { params })
      .then((r) => r.data),
};
