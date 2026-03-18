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

export interface ProductDetail extends ProductListItem {
  description?: string;
  technicalSpecs?: Record<string, unknown> | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  badges?: string[] | null;
  odooSync?: {
    odooProductId?: string | null;
    lastSyncedAt?: string | null;
  } | null;
}

export interface CreateProductPayload {
  sku: string;
  name: string;
  slug?: string;
  description?: string;
  technicalSpecs?: Record<string, unknown>;
  categoryId: string;
  brandId?: string;
  status?: "DRAFT" | "ACTIVE";
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  badges?: string[];
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {}

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

  getById: (id: string) =>
    api.get<ProductDetail>(`/products/${id}`).then((r) => r.data),

  create: (payload: CreateProductPayload) =>
    api.post<ProductDetail>("/products", payload).then((r) => r.data),

  update: (id: string, payload: UpdateProductPayload) =>
    api.put<ProductDetail>(`/products/${id}`, payload).then((r) => r.data),
};
