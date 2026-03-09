import api from "./api";
import type { PaginatedResponse } from "@/types/api";

export interface InventoryListItem {
  productId: string;
  productName: string;
  sku: string;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lastSyncedAt: string | null;
}

export const inventoryService = {
  getList: (params?: { page?: number; limit?: number; search?: string }) =>
    api
      .get<PaginatedResponse<InventoryListItem>>("/inventory/list", { params })
      .then((r) => r.data),

  sync: (params?: { productIds?: string; variantIds?: string }) =>
    api
      .post<{ products: { synced: number; failed: number }; variants: { synced: number; failed: number } }>(
        "/inventory/sync",
        undefined,
        { params }
      )
      .then((r) => r.data),
};
