"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AdminRouteGuard } from "@/components/guards/admin-route-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  geminiEnrichmentService,
  type GeminiBulkLogEntry,
  type GeminiBulkStartPayload,
  type GeminiBulkStatusResponse,
  type GeminiEnrichmentConfig,
} from "@/services/gemini-enrichment.service";

type BulkFormState = {
  limit: string;
  batchSize: string;
  startAfterId: string;
  delayMs: string;
  maxConsecutive429s: string;
  includeEnriched: boolean;
  dryRun: boolean;
  overwrite: boolean;
  onlyMissing: boolean;
};

const DEFAULT_FORM: BulkFormState = {
  limit: "0",
  batchSize: "100",
  startAfterId: "",
  delayMs: "200",
  maxConsecutive429s: "5",
  includeEnriched: false,
  dryRun: false,
  overwrite: false,
  onlyMissing: false,
};

function GeminiIntegrationContent() {
  const [config, setConfig] = useState<GeminiEnrichmentConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [status, setStatus] = useState<GeminiBulkStatusResponse | null>(null);
  const [logs, setLogs] = useState<GeminiBulkLogEntry[]>([]);
  const [form, setForm] = useState<BulkFormState>(DEFAULT_FORM);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const result = await geminiEnrichmentService.getConfig();
      setConfig(result);
    } catch {
      setConfig(null);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const result = await geminiEnrichmentService.getBulkStatus();
      setStatus(result);
    } catch {
      // Keep last known status on intermittent failures.
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const result = await geminiEnrichmentService.getBulkLogs({ limit: 50 });
      setLogs(result.logs);
    } catch {
      // Keep last known logs on intermittent failures.
    }
  }, []);

  useEffect(() => {
    void Promise.allSettled([loadConfig(), loadStatus(), loadLogs()]);
  }, [loadConfig, loadStatus, loadLogs]);

  useEffect(() => {
    let disposed = false;
    const poll = async () => {
      if (disposed) return;
      await Promise.allSettled([loadStatus(), loadLogs()]);
    };

    void poll();
    const intervalMs = status?.status === "RUNNING" ? 1500 : 7000;
    const timer = window.setInterval(() => {
      void poll();
    }, intervalMs);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [status?.status, loadStatus, loadLogs]);

  const canStart = useMemo(
    () => !!config?.isConfigured && status?.status !== "RUNNING" && !starting,
    [config?.isConfigured, status?.status, starting],
  );

  const setField = <K extends keyof BulkFormState>(key: K, value: BulkFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const parseIntOrUndefined = (value: string): number | undefined => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return undefined;
    return Math.trunc(parsed);
  };

  const toPayload = (): GeminiBulkStartPayload => {
    const payload: GeminiBulkStartPayload = {
      includeEnriched: form.includeEnriched,
      dryRun: form.dryRun,
      overwrite: form.overwrite,
      onlyMissing: form.onlyMissing,
    };
    const limit = parseIntOrUndefined(form.limit);
    const batchSize = parseIntOrUndefined(form.batchSize);
    const delayMs = parseIntOrUndefined(form.delayMs);
    const maxConsecutive429s = parseIntOrUndefined(form.maxConsecutive429s);
    if (typeof limit === "number") payload.limit = limit;
    if (typeof batchSize === "number") payload.batchSize = batchSize;
    if (typeof delayMs === "number") payload.delayMs = delayMs;
    if (typeof maxConsecutive429s === "number") payload.maxConsecutive429s = maxConsecutive429s;
    if (form.startAfterId.trim()) payload.startAfterId = form.startAfterId.trim();
    return payload;
  };

  const startBulkEnrichment = async () => {
    setStarting(true);
    try {
      const result = await geminiEnrichmentService.startBulk(toPayload());
      toast.success("Gemini bulk enrichment started");
      await Promise.allSettled([loadStatus(), loadLogs()]);
      if (result.jobId) {
        setStatus((prev) => (prev ? { ...prev, currentJobId: result.jobId } : prev));
      }
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === "string"
          ? (error as { response: { data: { message: string } } }).response.data.message
          : "Failed to start Gemini bulk enrichment";
      toast.error(message);
    } finally {
      setStarting(false);
    }
  };

  const cancelBulkEnrichment = async () => {
    setCancelling(true);
    try {
      await geminiEnrichmentService.cancelBulk();
      toast.success("Cancel requested");
      await Promise.allSettled([loadStatus(), loadLogs()]);
    } catch {
      toast.error("Failed to cancel Gemini bulk enrichment");
    } finally {
      setCancelling(false);
    }
  };

  const statusBadgeVariant = (value: string) =>
    value === "SUCCESS" ? "success" : value === "RUNNING" ? "secondary" : value === "FAILED" ? "destructive" : "outline";

  return (
    <AdminRouteGuard>
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Gemini Bulk Enrichment</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Run catalog text enrichment in bulk from the dashboard. This does not run image enrichment.
            </p>
          </div>
          <Badge variant={config?.isConfigured ? "success" : "outline"}>
            {config?.isConfigured ? "Configured" : "Not configured"}
          </Badge>
        </div>

        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Gemini API status from backend runtime config.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {configLoading ? (
              <p className="text-muted-foreground">Loading configuration status…</p>
            ) : (
              <>
                <p>
                  <span className="text-muted-foreground">Provider:</span> {config?.provider ?? "gemini"}
                </p>
                <p>
                  <span className="text-muted-foreground">Model:</span> {config?.model ?? "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">API key:</span> {config?.isConfigured ? "Configured" : "Missing"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle>Start Bulk Enrichment</CardTitle>
            <CardDescription>
              Use conservative values first. Recommended initial run: dry-run with a small limit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="limit">Limit (0 = all)</Label>
                <Input id="limit" value={form.limit} onChange={(e) => setField("limit", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batchSize">Batch size</Label>
                <Input id="batchSize" value={form.batchSize} onChange={(e) => setField("batchSize", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delayMs">Delay (ms)</Label>
                <Input id="delayMs" value={form.delayMs} onChange={(e) => setField("delayMs", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxConsecutive429s">Max consecutive 429s</Label>
                <Input
                  id="maxConsecutive429s"
                  value={form.maxConsecutive429s}
                  onChange={(e) => setField("maxConsecutive429s", e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="startAfterId">Start after product id (optional)</Label>
                <Input
                  id="startAfterId"
                  value={form.startAfterId}
                  onChange={(e) => setField("startAfterId", e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                />
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border"
                  checked={form.dryRun}
                  onChange={(e) => setField("dryRun", e.target.checked)}
                />
                Dry run (no writes)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border"
                  checked={form.overwrite}
                  onChange={(e) => setField("overwrite", e.target.checked)}
                />
                Overwrite existing fields
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border"
                  checked={form.onlyMissing}
                  onChange={(e) => setField("onlyMissing", e.target.checked)}
                />
                Only process missing SEO/description
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border"
                  checked={form.includeEnriched}
                  onChange={(e) => setField("includeEnriched", e.target.checked)}
                />
                Include already enriched products
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={startBulkEnrichment} disabled={!canStart}>
                {starting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Start bulk enrichment
                  </>
                )}
              </Button>
              {status?.status === "RUNNING" && (
                <Button variant="destructive" onClick={cancelBulkEnrichment} disabled={cancelling}>
                  {cancelling ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Cancelling…
                    </>
                  ) : (
                    <>
                      <RotateCcw className="size-4" />
                      Cancel
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle>Run Status</CardTitle>
            <CardDescription>Live status, counters, and recent logs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={statusBadgeVariant(status?.status ?? "IDLE")}>{status?.status ?? "IDLE"}</Badge>
            </div>
            {status?.status === "RUNNING" && (
              <Progress value={status.progress} className="h-2" />
            )}
            {status?.message && (
              <p className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm">{status.message}</p>
            )}
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <p><span className="text-muted-foreground">Scanned:</span> {status?.counters?.scanned ?? 0}</p>
              <p><span className="text-muted-foreground">Previewed:</span> {status?.counters?.previewed ?? 0}</p>
              <p><span className="text-muted-foreground">Updated:</span> {status?.counters?.updated ?? 0}</p>
              <p><span className="text-muted-foreground">Marked enriched:</span> {status?.counters?.markedEnriched ?? 0}</p>
              <p><span className="text-muted-foreground">Skipped no suggestion:</span> {status?.counters?.skippedNoSuggestion ?? 0}</p>
              <p><span className="text-muted-foreground">Skipped no change:</span> {status?.counters?.skippedNoChange ?? 0}</p>
              <p><span className="text-muted-foreground">Failed:</span> {status?.counters?.failed ?? 0}</p>
              <p><span className="text-muted-foreground">Last product id:</span> {status?.lastProductId ?? "—"}</p>
            </div>
            {status?.lastRunAt && (
              <p className="text-xs text-muted-foreground">
                Last run update: {new Date(status.lastRunAt).toLocaleString()}
              </p>
            )}
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Recent logs</p>
              <div className="max-h-56 space-y-1 overflow-y-auto scrollbar-thin font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground">No logs yet</p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        "rounded-lg px-2 py-1",
                        log.type === "error" && "bg-destructive/10 text-destructive",
                        log.type === "warning" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
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
      </div>
    </AdminRouteGuard>
  );
}

export default function GeminiIntegrationPage() {
  return <GeminiIntegrationContent />;
}
