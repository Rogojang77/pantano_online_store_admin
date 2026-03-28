import api from "./api";

const BASE = "/integrations/gemini-enrichment";

export interface GeminiEnrichmentConfig {
  provider: "gemini";
  model: string;
  isConfigured: boolean;
}

export interface GeminiPreviewProduct {
  id: string;
  ean: string;
  sku: string;
  name: string;
  barcode: string | null;
  brand: string | null;
}

export interface GeminiPreviewResponse {
  product: GeminiPreviewProduct;
  geminiResult: {
    found: boolean;
    model: string | null;
    apiVersion?: string | null;
    usedDiscovery?: boolean;
    error?: string;
    message?: string;
  };
  mappedFields: Record<string, unknown> | null;
  dynamicFields: Record<string, unknown> | null;
}

export interface GeminiDraftPreviewPayload {
  ean?: string;
  sku?: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  barcode?: string | null;
  brand?: string | null;
  technicalSpecs?: Record<string, unknown> | null;
}

export interface GeminiBulkStartPayload {
  limit?: number;
  batchSize?: number;
  startAfterId?: string;
  delayMs?: number;
  maxConsecutive429s?: number;
  includeEnriched?: boolean;
  dryRun?: boolean;
  overwrite?: boolean;
  onlyMissing?: boolean;
}

export interface GeminiBulkCounters {
  scanned: number;
  previewed: number;
  updated: number;
  markedEnriched: number;
  skippedNoSuggestion: number;
  skippedNoChange: number;
  failed: number;
}

export interface GeminiBulkStatusResponse {
  status: "IDLE" | "RUNNING" | "FAILED" | "SUCCESS";
  progress: number;
  message?: string;
  lastRunAt?: string;
  lastProductId?: string;
  currentJobId?: string;
  counters: GeminiBulkCounters;
}

export interface GeminiBulkLogEntry {
  id: string;
  type: "sync" | "error" | "warning" | "info";
  message: string;
  createdAt: string;
}

export const geminiEnrichmentService = {
  getConfig: () =>
    api.get<GeminiEnrichmentConfig>(`${BASE}/config`).then((r) => r.data),

  preview: (productId: string) =>
    api.get<GeminiPreviewResponse>(`${BASE}/preview/${productId}`).then((r) => r.data),

  previewDraft: (payload: GeminiDraftPreviewPayload) =>
    api.post<GeminiPreviewResponse>(`${BASE}/preview-draft`, payload).then((r) => r.data),

  startBulk: (payload: GeminiBulkStartPayload) =>
    api.post<{ jobId: string }>(`${BASE}/bulk/start`, payload).then((r) => r.data),

  getBulkStatus: () =>
    api.get<GeminiBulkStatusResponse>(`${BASE}/bulk/status`).then((r) => r.data),

  cancelBulk: () =>
    api.post<{ ok: boolean }>(`${BASE}/bulk/cancel`).then((r) => r.data),

  getBulkLogs: (params?: { limit?: number }) =>
    api.get<{ logs: GeminiBulkLogEntry[] }>(`${BASE}/bulk/logs`, { params }).then((r) => r.data),
};
