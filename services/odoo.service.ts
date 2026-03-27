import api from "./api";
import type {
  OdooConfig,
  OdooConnectionTestResult,
  OdooPreviewProductsResponse,
  SyncState,
  SyncLogEntry,
  WebhookConfig,
} from "@/types/odoo";

const BASE = "/integrations/odoo";

type BackendOdooConfig = {
  url?: string;
  db?: string;
  username?: string;
  isConfigured: boolean;
  hasApiKey: boolean;
};

type OdooSupplierLookupItem = {
  odooId: number;
  found: boolean;
  partnerId: number | null;
  partnerName: string | null;
  minQty: number | null;
  price: number | null;
  currencyName: string | null;
  active: boolean | null;
};

const mapBackendConfigToFrontend = (backend: BackendOdooConfig): OdooConfig => ({
  baseUrl: backend.url ?? "",
  database: backend.db ?? "",
  username: backend.username ?? "",
  // Password is never sent back from the API
  password: undefined,
  // We only know that an API key exists; do not expose it. UI can treat non-empty as "set".
  apiKey: backend.hasApiKey ? "********" : "",
  // These are not yet configurable server-side; keep UX defaults in the dashboard.
  timeoutMs: 10000,
  syncIntervalCron: "0 * * * *",
  isConfigured: backend.isConfigured,
});

export const odooService = {
  getConfig: () =>
    api
      .get<BackendOdooConfig>(`${BASE}/config`)
      .then((r) => mapBackendConfigToFrontend(r.data)),

  updateConfig: (data: Partial<OdooConfig>) =>
    api
      .patch<BackendOdooConfig>(`${BASE}/config`, {
        url: data.baseUrl || undefined,
        db: data.database,
        username: data.username,
        apiKey: data.apiKey || undefined,
      })
      .then((r) => mapBackendConfigToFrontend(r.data)),

  testConnection: () =>
    api
      .post<OdooConnectionTestResult>(`${BASE}/test-connection`)
      .then((r) => r.data),

  getProductsPreview: (params?: { limit?: number; offset?: number }) =>
    api
      .get<OdooPreviewProductsResponse>(`${BASE}/products/preview`, { params })
      .then((r) => r.data),

  getSupplierNamesByOdooIds: async (odooIds: number[]): Promise<Record<number, string>> => {
    const uniqueIds = Array.from(
      new Set(
        odooIds.filter((id) => Number.isInteger(id) && id > 0)
      )
    );
    if (!uniqueIds.length) {
      return {};
    }

    const response = await api.get<{ items: OdooSupplierLookupItem[] }>(`${BASE}/suppliers`, {
      params: { odooIds: uniqueIds.join(",") },
    });

    const lookup: Record<number, string> = {};
    for (const item of response.data.items) {
      const sellerName = item.partnerName?.trim();
      if (item.found && sellerName) {
        lookup[item.odooId] = sellerName;
      }
    }

    return lookup;
  },

  triggerSync: (type: "products" | "stock" | "categories" | "full") =>
    api.post<{ jobId: string }>(`${BASE}/sync`, { type }).then((r) => r.data),

  cancelSync: () => api.post(`${BASE}/sync/cancel`).then((r) => r.data),

  getSyncStatus: () =>
    api.get<SyncState>(`${BASE}/sync/status`).then((r) => r.data),

  getLogs: (params?: { from?: string; to?: string; limit?: number }) =>
    api
      .get<{ logs: SyncLogEntry[] }>(`${BASE}/logs`, { params })
      .then((r) => r.data),

  getWebhookConfig: () =>
    api.get<WebhookConfig>(`${BASE}/webhook`).then((r) => r.data),
};
