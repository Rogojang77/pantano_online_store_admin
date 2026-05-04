"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { AdminRouteGuard } from "@/components/guards/admin-route-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { odooService } from "@/services/odoo.service";
import type {
  OdooConfig,
  OdooPreviewProduct,
  SyncState,
  SyncLogEntry,
} from "@/types/odoo";
import { cn } from "@/lib/utils";
import { notifyApiError } from "@/lib/notify-api-error";

function OdooIntegrationContent() {
  const [config, setConfig] = useState<OdooConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [logsExpanded, setLogsExpanded] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewProducts, setPreviewProducts] = useState<OdooPreviewProduct[]>([]);
  const [previewFields, setPreviewFields] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const data = await odooService.getConfig();
      setConfig(data);
    } catch {
      setConfig(null);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const loadSyncStatus = useCallback(async () => {
    try {
      const data = await odooService.getSyncStatus();
      setSyncState(data);
    } catch {
      setSyncState({ status: "IDLE" });
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const { logs: list } = await odooService.getLogs({ limit: 50 });
      setLogs(list);
    } catch {
      // Keep last known logs on transient polling/network failures.
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadSyncStatus();
    loadLogs();
  }, [loadConfig, loadSyncStatus, loadLogs]);

  useEffect(() => {
    let disposed = false;

    const poll = async () => {
      if (disposed) return;
      await Promise.allSettled([loadSyncStatus(), loadLogs()]);
    };

    // Refresh immediately, then continue polling.
    void poll();

    const intervalMs = syncState?.status === "RUNNING" ? 1500 : 7000;
    const timer = window.setInterval(() => {
      void poll();
    }, intervalMs);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [syncState?.status, loadSyncStatus, loadLogs]);

  const triggerSync = async (type: "products" | "stock" | "categories" | "full") => {
    setSyncing(true);
    try {
      await odooService.triggerSync(type);
      toast.success(`Sync (${type}) started`);
      await Promise.all([loadSyncStatus(), loadLogs()]);
    } catch (error) {
      notifyApiError(error, "Failed to start sync");
    } finally {
      setSyncing(false);
    }
  };

  const loadProductsPreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const data = await odooService.getProductsPreview({ limit: 1, offset: 238 });
      setPreviewProducts(data.items);
      setPreviewFields(data.fields);
      toast.success(`Loaded ${data.count} products preview`);
    } catch (error: unknown) {
      const message =
        (typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === "string")
          ? (error as { response: { data: { message: string } } }).response.data.message
          : "Failed to load products preview";
      setPreviewError(message);
      setPreviewProducts([]);
      setPreviewFields([]);
      notifyApiError(error, "Failed to load products preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const cancelSync = async () => {
    try {
      await odooService.cancelSync();
      toast.success("Sync cancelled");
      await Promise.all([loadSyncStatus(), loadLogs()]);
    } catch (error) {
      notifyApiError(error, "Failed to cancel");
    }
  };

  const statusBadgeVariant = (status: string) =>
    status === "SUCCESS" ? "success" : status === "RUNNING" ? "secondary" : status === "FAILED" ? "destructive" : "outline";
  return (
    <AdminRouteGuard>
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Odoo Integration</h1>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={config?.isConfigured ? "success" : "outline"}>
              Configuration: {config?.isConfigured ? "Ready" : "Missing values"}
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground -mt-6">
          Odoo connection uses backend environment variables only.
        </p>

        {/* 1. Connection source (env only) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle>Connection source</CardTitle>
              <CardDescription>
                Credentials are loaded from backend `.env` (`ODOO_URL`, `ODOO_DB`, `ODOO_USERNAME`, `ODOO_API` / `ODOO_PASSWORD`).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {configLoading ? (
                <p className="text-muted-foreground">Loading configuration status…</p>
              ) : (
                <>
                  <p><span className="text-muted-foreground">Configured:</span> {config?.isConfigured ? "Yes" : "No"}</p>
                  <p><span className="text-muted-foreground">Base URL:</span> {config?.baseUrl || "—"}</p>
                  <p><span className="text-muted-foreground">Database:</span> {config?.database || "—"}</p>
                  <p><span className="text-muted-foreground">Username:</span> {config?.username || "—"}</p>
                  <p><span className="text-muted-foreground">Credential:</span> {config?.apiKey ? "Set in env" : "Missing"}</p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 2. Product preview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle>Preview Odoo products</CardTitle>
              <CardDescription>
                Quick sample from Odoo (first 20 rows) before any import/save to local database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="rounded-2xl" onClick={loadProductsPreview} disabled={previewLoading}>
                {previewLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Loading preview…
                  </>
                ) : (
                  "Load preview"
                )}
              </Button>

              {previewError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  {previewError}
                </div>
              )}

              {previewProducts.length > 0 && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                    Returning all readable fields from Odoo `product.product` (image binary fields excluded for payload size). Fields returned:{" "}
                    <span className="font-semibold text-foreground">{previewFields.length}</span>
                  </div>
                  <div className="max-h-96 overflow-auto rounded-2xl border border-border/60 bg-muted/20 p-3">
                    <pre className="text-xs">
                      {JSON.stringify(previewProducts, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 3. Sync controls */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle>Sync controls</CardTitle>
              <CardDescription>
                Manual product, stock, categories, or full resync. Cancel running sync if needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => triggerSync("products")}
                  disabled={syncing || syncState?.status === "RUNNING"}
                >
                  Product sync
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => triggerSync("stock")}
                  disabled={syncing || syncState?.status === "RUNNING"}
                >
                  Stock sync
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => triggerSync("categories")}
                  disabled={syncing || syncState?.status === "RUNNING"}
                >
                  Categories
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => triggerSync("full")}
                  disabled={syncing || syncState?.status === "RUNNING"}
                >
                  Full resync
                </Button>
                {(syncState?.status === "RUNNING") && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="rounded-xl"
                    onClick={cancelSync}
                  >
                    <RotateCcw className="size-4" />
                    Cancel sync
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={statusBadgeVariant(syncState?.status ?? "IDLE")}>
                    {syncState?.status ?? "IDLE"}
                  </Badge>
                </div>
                {syncState?.status === "RUNNING" && syncState?.progress != null && (
                  <Progress value={syncState.progress} className="h-2" />
                )}
                {syncState?.lastSyncAt && (
                  <p className="text-xs text-muted-foreground">
                    Last sync: {new Date(syncState.lastSyncAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Sync logs (live)</p>
                <div className="max-h-40 overflow-y-auto scrollbar-thin space-y-1 font-mono text-xs">
                  {logs.length === 0 ? (
                    <p className="text-muted-foreground">No logs yet</p>
                  ) : (
                    logs.slice(0, 20).map((log) => (
                      <div
                        key={log.id}
                        className={cn(
                          "rounded-lg px-2 py-1",
                          log.type === "error" && "bg-destructive/10 text-destructive",
                          log.type === "warning" && "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        )}
                      >
                        <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleTimeString()}</span>{" "}
                        {log.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 4. Logs panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle>Recent sync logs</CardTitle>
              <CardDescription>Errors, warnings; filter by date. Expand for JSON.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No logs</p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-border/60 bg-card p-3"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-between text-left text-sm"
                        onClick={() =>
                          setLogsExpanded((p) => ({ ...p, [log.id]: !p[log.id] }))
                        }
                      >
                        <span className={cn(
                          log.type === "error" && "text-destructive",
                          log.type === "warning" && "text-amber-600 dark:text-amber-400"
                        )}>
                          [{log.type}] {log.message}
                        </span>
                        {log.details && Object.keys(log.details).length > 0 ? (
                          logsExpanded[log.id] ? (
                            <ChevronDown className="size-4 shrink-0" />
                          ) : (
                            <ChevronRight className="size-4 shrink-0" />
                          )
                        ) : null}
                      </button>
                      {logsExpanded[log.id] && log.details && (
                        <pre className="mt-2 overflow-x-auto rounded-xl bg-muted/50 p-2 text-xs">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AdminRouteGuard>
  );
}

export default function OdooIntegrationPage() {
  return <OdooIntegrationContent />;
}
