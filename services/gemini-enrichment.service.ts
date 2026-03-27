import api from "./api";

const BASE = "/integrations/gemini-enrichment";

export interface GeminiEnrichmentConfig {
  provider: "gemini";
  model: string;
  isConfigured: boolean;
}

export interface GeminiPreviewProduct {
  id: string;
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
  sku?: string;
  name: string;
  description?: string | null;
  barcode?: string | null;
  brand?: string | null;
  technicalSpecs?: Record<string, unknown> | null;
}

export const geminiEnrichmentService = {
  getConfig: () =>
    api.get<GeminiEnrichmentConfig>(`${BASE}/config`).then((r) => r.data),

  preview: (productId: string) =>
    api.get<GeminiPreviewResponse>(`${BASE}/preview/${productId}`).then((r) => r.data),

  previewDraft: (payload: GeminiDraftPreviewPayload) =>
    api.post<GeminiPreviewResponse>(`${BASE}/preview-draft`, payload).then((r) => r.data),
};
