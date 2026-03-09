import api from "./api";
import type { PaginatedResponse } from "@/types/api";

export type ContentBlockType = "HERO" | "PROMO_GRID" | "BANNER";

export interface ContentBlockItem {
  id: string;
  type: ContentBlockType;
  placement: string;
  sortOrder: number;
  isActive: boolean;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentBlockPayload {
  type: ContentBlockType;
  placement: string;
  sortOrder?: number;
  isActive?: boolean;
  payload: Record<string, unknown>;
}

export interface UpdateContentBlockPayload {
  placement?: string;
  sortOrder?: number;
  isActive?: boolean;
  payload?: Record<string, unknown>;
}

export const cmsService = {
  getBlocksByPlacement: (placement: string) =>
    api.get<unknown[]>(`/cms/blocks`, { params: { placement } }).then((r) => r.data),

  getList: (params?: {
    page?: number;
    limit?: number;
    placement?: string;
    type?: ContentBlockType;
    isActive?: boolean;
  }) =>
    api
      .get<PaginatedResponse<ContentBlockItem>>("/cms/blocks/admin", { params })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<ContentBlockItem>(`/cms/blocks/${id}`).then((r) => r.data),

  create: (payload: CreateContentBlockPayload) =>
    api.post<ContentBlockItem>("/cms/blocks", payload).then((r) => r.data),

  update: (id: string, payload: UpdateContentBlockPayload) =>
    api.put<ContentBlockItem>(`/cms/blocks/${id}`, payload).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/cms/blocks/${id}`).then((r) => r.data),

  reorder: (blockIds: string[]) =>
    api.patch("/cms/blocks/reorder", { blockIds }).then((r) => r.data),
};
