import api from "./api";

export interface DashboardStats {
  products: number;
  orders: number;
  ordersPending: number;
  users: number;
  categories: number;
}

export type CatalogIssueType =
  | "missing_primary_image"
  | "short_description"
  | "missing_ean"
  | "missing_documents"
  | "low_completeness"
  | "duplicate_sku_or_ean";

export interface CatalogHealth {
  missingPrimaryImage: number;
  shortDescription: number;
  missingEan: number;
  missingDocuments: number;
  lowCompleteness: number;
  duplicateSkuOrEan: number;
}

export interface CatalogIssueItem {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  ean: string | null;
  updatedAt: string;
}

export interface CatalogIssueResponse {
  data: CatalogIssueItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AnalyticsFunnel {
  windowDays: number;
  since: string;
  counts: {
    viewProduct: number;
    addToCart: number;
    beginCheckout: number;
    checkoutStep: number;
    purchase: number;
  };
  rates: {
    viewToCartPct: number;
    cartToBeginCheckoutPct: number;
    beginCheckoutToPurchasePct: number;
    viewToPurchasePct: number;
  };
}

export const adminService = {
  getDashboardStats: () =>
    api.get<DashboardStats>("/admin/dashboard").then((r) => r.data),
  getCatalogHealth: () =>
    api.get<CatalogHealth>("/admin/catalog/health").then((r) => r.data),
  getCatalogIssues: (type: CatalogIssueType, page = 1, limit = 25) =>
    api
      .get<CatalogIssueResponse>("/admin/catalog/issues", { params: { type, page, limit } })
      .then((r) => r.data),
  downloadCatalogIssuesCsv: async (type: CatalogIssueType): Promise<Blob> => {
    const res = await api.get<Blob>("/admin/catalog/issues.csv", {
      params: { type },
      responseType: "blob",
    });
    return res.data;
  },
  getAnalyticsFunnel: (days = 30) =>
    api.get<AnalyticsFunnel>("/admin/analytics/funnel", { params: { days } }).then((r) => r.data),
};
