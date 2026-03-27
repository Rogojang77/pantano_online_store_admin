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

export interface ProductImageItem {
  id: string;
  url: string;
  alt?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface UpdateProductImagePayload {
  alt?: string;
  sortOrder?: number;
  isPrimary?: boolean;
}

export interface ProductDetail extends ProductListItem {
  description?: string;
  baseUnit?: string | null;
  contentAmount?: number | null;
  pricePerUnit?: number | null;
  packSize?: number | null;
  storeAvailability?: "IN_STOCK" | "LIMITED" | "OUT_OF_STOCK" | null;
  clickCollectEligible?: boolean | null;
  technicalSpecs?: Record<string, unknown> | null;
  geminiMappedFields?: Record<string, unknown> | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  badges?: string[] | null;
  documents?: ProductDocumentItem[];
  odooSync?: {
    odooProductId?: string | null;
    lastSyncedAt?: string | null;
  } | null;
  images?: ProductImageItem[];
  variants?: ProductVariantItem[];
  productAttributes?: ProductAttributeInputItem[];
  requiredAttributes?: ProductAttributeRequirementItem[];
  pdpCompleteness?: ProductPdpCompleteness;
}

export interface ProductDocumentItem {
  id: string;
  productId: string;
  title: string;
  type: string | null;
  fileUrl: string;
  sortOrder: number;
}

export interface ProductAttributeRequirementValueItem {
  id: string;
  value: string;
}

export interface ProductAttributeRequirementItem {
  definitionId: string;
  categoryId: string;
  isRequired: boolean;
  definition: {
    id: string;
    name: string;
    type: string;
    unit?: string | null;
    isRequired: boolean;
    values: ProductAttributeRequirementValueItem[];
  };
}

export interface ProductPdpChecklistItem {
  key: string;
  label: string;
  weight: number;
  complete: boolean;
  missing: string[];
}

export interface ProductPdpCompleteness {
  score: number;
  checklist: ProductPdpChecklistItem[];
  blockers: string[];
  requiredDocumentTypes: string[];
  missingRequiredDocumentTypes: string[];
  missingRequiredAttributes: string[];
}

export interface ProductAttributeInputItem {
  definitionId: string;
  valueId?: string;
  valueText?: string;
}

export interface CreateProductPayload {
  sku: string;
  name: string;
  slug?: string;
  description?: string;
  baseUnit?: string;
  contentAmount?: number;
  pricePerUnit?: number;
  packSize?: number;
  storeAvailability?: "IN_STOCK" | "LIMITED" | "OUT_OF_STOCK";
  clickCollectEligible?: boolean;
  technicalSpecs?: Record<string, unknown>;
  geminiMappedFields?: Record<string, unknown>;
  categoryId: string;
  brandId?: string;
  status?: "DRAFT" | "ACTIVE";
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  badges?: string[];
  productAttributes?: ProductAttributeInputItem[];
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export interface VariantAttributeItem {
  definitionId: string;
  valueId: string;
  definition?: { id: string; name: string };
  value?: { id: string; value: string };
}

export interface ProductVariantItem {
  id: string;
  productId: string;
  sku: string;
  name?: string | null;
  price: number;
  compareAtPrice?: number | null;
  weightOverride?: number | null;
  stockQuantity?: number;
  isActive: boolean;
  variantAttributes?: VariantAttributeItem[];
}

export interface CreateVariantPayload {
  productId: string;
  sku: string;
  name?: string;
  price: number;
  compareAtPrice?: number;
  weightOverride?: number;
  stockQuantity?: number;
  isActive?: boolean;
  attributes?: { definitionId: string; valueId: string }[];
}

export type UpdateVariantPayload = Partial<Omit<CreateVariantPayload, "productId">>;

export const productsService = {
  getList: (params?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    brandId?: string;
    status?: string;
    search?: string;
    sortBy?: "name" | "createdAt" | "updatedAt" | "sku";
    sortDir?: "asc" | "desc";
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

  updateImage: (productId: string, imageId: string, payload: UpdateProductImagePayload) =>
    api
      .patch<ProductImageItem>(`/products/${productId}/images/${imageId}`, payload)
      .then((r) => r.data),

  deleteImage: (productId: string, imageId: string) =>
    api.delete<{ success: boolean }>(`/products/${productId}/images/${imageId}`).then((r) => r.data),

  remove: (id: string) =>
    api.delete<{ success: boolean }>(`/products/${id}`).then((r) => r.data),

  archive: (id: string) =>
    api.put<ProductDetail>(`/products/${id}`, { status: "ARCHIVED" }).then((r) => r.data),

  createVariant: (payload: CreateVariantPayload) =>
    api.post<ProductVariantItem>("/products/variants", payload).then((r) => r.data),

  getVariant: (variantId: string) =>
    api.get<ProductVariantItem>(`/products/variants/${variantId}`).then((r) => r.data),

  updateVariant: (variantId: string, payload: UpdateVariantPayload) =>
    api.put<ProductVariantItem>(`/products/variants/${variantId}`, payload).then((r) => r.data),
};
