import api from "./api";

const BASE = "/integrations/icecat";

export interface IcecatConfig {
  username: string | null;
  language: string;
  hasApiToken: boolean;
  hasContentToken: boolean;
  isConfigured: boolean;
}

export interface EnrichmentStats {
  total: number;
  enriched: number;
  pending: number;
  withBarcode: number;
  withBrand: number;
}

export interface EnrichmentResult {
  productId: string;
  sku: string;
  success: boolean;
  lookupMethod: string | null;
  icecatId: number | null;
  fieldsUpdated: string[];
  imagesAdded: number;
  error?: string;
}

export interface EnrichBatchResponse {
  processed: number;
  succeeded: number;
  failed: number;
  results: EnrichmentResult[];
}

export interface PreviewProduct {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  brand: string | null;
}

export interface PreviewResponse {
  product: PreviewProduct;
  icecatResult: {
    found: boolean;
    lookupMethod: string | null;
    error?: string;
    data: unknown;
  };
  mappedFields: Record<string, unknown> | null;
}

export interface PreviewInputPayload {
  name?: string;
  sku?: string;
  barcode?: string;
  brand?: string;
  technicalSpecs?: Record<string, unknown>;
}

export interface DownloadImagesPayload {
  productId: string;
  images: { url: string; alt?: string }[];
}

export interface DownloadImagesResult {
  downloaded: number;
  failed: number;
  productImages: { id: string; url: string; alt: string | null; isPrimary: boolean }[];
}

export interface EnrichmentDocumentItem {
  url: string;
  title: string;
  type?: string | null;
}

export interface DownloadDocumentsPayload {
  productId: string;
  documents: EnrichmentDocumentItem[];
}

export interface DownloadDocumentsResult {
  downloaded: number;
  failed: number;
  productDocuments: { id: string; url: string; title: string; type: string | null }[];
}

export const icecatService = {
  getConfig: () =>
    api.get<IcecatConfig>(`${BASE}/config`).then((r) => r.data),

  getStats: () =>
    api.get<EnrichmentStats>(`${BASE}/stats`).then((r) => r.data),

  preview: (productId: string) =>
    api.get<PreviewResponse>(`${BASE}/preview/${productId}`).then((r) => r.data),

  previewInput: (payload: PreviewInputPayload) =>
    api.post<PreviewResponse>(`${BASE}/preview-input`, payload).then((r) => r.data),

  downloadImages: (payload: DownloadImagesPayload) =>
    api.post<DownloadImagesResult>(`${BASE}/download-images`, payload).then((r) => r.data),

  downloadDocuments: (payload: DownloadDocumentsPayload) =>
    api.post<DownloadDocumentsResult>(`${BASE}/download-documents`, payload).then((r) => r.data),

  enrichOne: (productId: string) =>
    api.post<EnrichmentResult>(`${BASE}/enrich/${productId}`).then((r) => r.data),

  enrichBatch: (limit: number) =>
    api.post<EnrichBatchResponse>(`${BASE}/enrich-batch`, null, { params: { limit } }).then((r) => r.data),
};
