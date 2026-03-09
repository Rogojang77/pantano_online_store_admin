export interface OdooConfig {
  baseUrl: string;
  database: string;
  username: string;
  /** Never returned from API after save */
  password?: string;
  apiKey?: string;
  timeoutMs: number;
  syncIntervalCron: string;
  isConfigured: boolean;
}

export interface OdooConnectionTestResult {
  success: boolean;
  latencyMs?: number;
  odooVersion?: string;
  error?: string;
}

export type SyncStatus = "IDLE" | "RUNNING" | "FAILED" | "SUCCESS";

export interface SyncState {
  status: SyncStatus;
  progress?: number;
  lastSyncAt?: string;
  message?: string;
}

export interface SyncLogEntry {
  id: string;
  type: "sync" | "error" | "warning" | "info";
  message: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface WebhookConfig {
  url: string;
  active: boolean;
}
