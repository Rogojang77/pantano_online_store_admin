import api from "./api";
import type { PaginatedResponse } from "@/types/api";

export interface BrandItem {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export const brandsService = {
  getList: (params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    search?: string;
  }) =>
    api
      .get<PaginatedResponse<BrandItem>>("/brands", { params })
      .then((r) => r.data),
  getAll: async (): Promise<BrandItem[]> => {
    const pageSize = 100;
    let page = 1;
    const out: BrandItem[] = [];

    for (;;) {
      const response = await brandsService.getList({
        page,
        limit: pageSize,
      });
      out.push(...response.data);
      if (!response.meta.hasNext) {
        break;
      }
      page += 1;
    }

    return out;
  },
};
