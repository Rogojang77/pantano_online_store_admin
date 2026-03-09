import api from "./api";
import type {
  OdooConfig,
  OdooConnectionTestResult,
  SyncState,
  SyncLogEntry,
  WebhookConfig,
} from "@/types/odoo";

const BASE = "/integrations/odoo";

export const odooService = {
  getConfig: () => api.get<OdooConfig>(`${BASE}/config`).then((r) => r.data),

  updateConfig: (data: Partial<OdooConfig>) =>
    api.patch<OdooConfig>(`${BASE}/config`, data).then((r) => r.data),

  testConnection: () =>
    api
      .post<OdooConnectionTestResult>(`${BASE}/test-connection`)
      .then((r) => r.data),

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
