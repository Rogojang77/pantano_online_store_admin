import api from "./api";
import type { PaginatedResponse } from "@/types/api";

export type PromotionType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface PromotionItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: PromotionType;
  value: number;
  minPurchaseAmount: number | null;
  validFrom: string;
  validTo: string;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromotionPayload {
  code: string;
  name: string;
  description?: string;
  type: PromotionType;
  value: number;
  minPurchaseAmount?: number;
  validFrom: string;
  validTo: string;
  usageLimit?: number;
  isActive?: boolean;
}

export interface UpdatePromotionPayload {
  code?: string;
  name?: string;
  description?: string;
  type?: PromotionType;
  value?: number;
  minPurchaseAmount?: number;
  validFrom?: string;
  validTo?: string;
  usageLimit?: number;
  isActive?: boolean;
}

export interface ValidateCouponResult {
  valid: boolean;
  message?: string;
  discount?: number;
  promotion?: { id: string; code: string; type: string; value: number };
}

export const promotionsService = {
  getList: (params?: { page?: number; limit?: number; isActive?: boolean }) =>
    api
      .get<PaginatedResponse<PromotionItem>>("/promotions", { params })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<PromotionItem>(`/promotions/${id}`).then((r) => r.data),

  create: (payload: CreatePromotionPayload) =>
    api.post<PromotionItem>("/promotions", payload).then((r) => r.data),

  update: (id: string, payload: UpdatePromotionPayload) =>
    api.put<PromotionItem>(`/promotions/${id}`, payload).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/promotions/${id}`).then((r) => r.data),

  validate: (code: string, subtotal?: number) =>
    api
      .post<ValidateCouponResult>("/promotions/validate", { code, subtotal })
      .then((r) => r.data),
};
