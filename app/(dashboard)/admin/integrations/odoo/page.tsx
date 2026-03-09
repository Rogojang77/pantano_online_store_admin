"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  Play,
  RotateCcw,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { AdminRouteGuard } from "@/components/guards/admin-route-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { odooService } from "@/services/odoo.service";
import type { OdooConfig, OdooConnectionTestResult, SyncState, SyncLogEntry, WebhookConfig } from "@/types/odoo";
import { cn } from "@/lib/utils";

const configSchema = z.object({
  baseUrl: z.string().url("Invalid URL").or(z.literal("")),
  database: z.string().min(1, "Required"),
  username: z.string().min(1, "Required"),
  password: z.string().optional(),
  apiKey: z.string().optional(),
  timeoutMs: z.number().min(1000).max(60000),
  syncIntervalCron: z.string().min(1, "Required"),
});

type ConfigFormData = z.infer<typeof configSchema>;

const defaultConfig: ConfigFormData = {
  baseUrl: "",
  database: "",
  username: "",
  password: "",
  apiKey: "",
  timeoutMs: 10000,
  syncIntervalCron: "0 * * * *",
};

function OdooIntegrationContent() {
  const [config, setConfig] = useState<OdooConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [testResult, setTestResult] = useState<OdooConnectionTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [logsExpanded, setLogsExpanded] = useState<Record<string, boolean>>({});
  const [webhook, setWebhook] = useState<WebhookConfig | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: defaultConfig,
  });

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const data = await odooService.getConfig();
      setConfig(data);
      reset({
        baseUrl: data.baseUrl || "",
        database: data.database || "",
        username: data.username || "",
        password: "",
        apiKey: data.apiKey || "",
        timeoutMs: data.timeoutMs ?? 10000,
        syncIntervalCron: data.syncIntervalCron || "0 * * * *",
      });
    } catch {
      reset(defaultConfig);
    } finally {
      setConfigLoading(false);
    }
  }, [reset]);

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
      setLogs([]);
    }
  }, []);

  const loadWebhook = useCallback(async () => {
    try {
      const data = await odooService.getWebhookConfig();
      setWebhook(data);
    } catch {
      setWebhook(null);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadSyncStatus();
    loadLogs();
    loadWebhook();
  }, [loadConfig, loadSyncStatus, loadLogs, loadWebhook]);

  const onSaveConfig = async (data: ConfigFormData) => {
    setSaving(true);
    try {
      await odooService.updateConfig({
        baseUrl: data.baseUrl || undefined,
        database: data.database,
        username: data.username,
        password: data.password || undefined,
        apiKey: data.apiKey || undefined,
        timeoutMs: data.timeoutMs,
        syncIntervalCron: data.syncIntervalCron,
      });
      toast.success("Configuration saved");
      loadConfig();
    } catch (e) {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const onTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await odooService.testConnection();
      setTestResult(result);
      if (result.success) toast.success("Connection successful");
      else toast.error(result.error || "Connection failed");
    } catch {
      setTestResult({ success: false, error: "Request failed" });
      toast.error("Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const triggerSync = async (type: "products" | "stock" | "categories" | "full") => {
    setSyncing(true);
    try {
      await odooService.triggerSync(type);
      toast.success(`Sync (${type}) started`);
      loadSyncStatus();
    } catch {
      toast.error("Failed to start sync");
    } finally {
      setSyncing(false);
    }
  };

  const cancelSync = async () => {
    try {
      await odooService.cancelSync();
      toast.success("Sync cancelled");
      loadSyncStatus();
    } catch {
      toast.error("Failed to cancel");
    }
  };

  const copyWebhookUrl = () => {
    if (webhook?.url) {
      navigator.clipboard.writeText(webhook.url);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const statusBadgeVariant = (status: string) =>
    status === "SUCCESS" ? "success" : status === "RUNNING" ? "secondary" : status === "FAILED" ? "destructive" : "outline";

  return (
    <AdminRouteGuard>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Odoo Integration</h1>
          <p className="text-muted-foreground mt-1">
            Configure connection, sync, and webhooks (Admin only)
          </p>
        </div>

        {/* 1. Configure Odoo Connection */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle>Connection settings</CardTitle>
              <CardDescription>
                Base URL, database, credentials. Password is masked and not shown after save.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-10 rounded-2xl bg-muted/60 animate-pulse" />
                  ))}
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSaveConfig)} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="baseUrl">Odoo Base URL</Label>
                      <Input
                        id="baseUrl"
                        placeholder="https://odoo.example.com"
                        {...register("baseUrl")}
                      />
                      {errors.baseUrl && (
                        <p className="text-sm text-destructive">{errors.baseUrl.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="database">Database name</Label>
                      <Input id="database" placeholder="mycompany" {...register("database")} />
                      {errors.database && (
                        <p className="text-sm text-destructive">{errors.database.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" placeholder="admin" {...register("username")} />
                      {errors.username && (
                        <p className="text-sm text-destructive">{errors.username.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Leave blank to keep current"
                        autoComplete="new-password"
                        {...register("password")}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key (optional)</Label>
                      <Input id="apiKey" type="password" placeholder="••••••••" {...register("apiKey")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeoutMs">Timeout (ms)</Label>
                      <Input
                        id="timeoutMs"
                        type="number"
                        {...register("timeoutMs", { valueAsNumber: true })}
                      />
                      {errors.timeoutMs && (
                        <p className="text-sm text-destructive">{errors.timeoutMs.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="syncIntervalCron">Sync interval (cron)</Label>
                    <Input
                      id="syncIntervalCron"
                      placeholder="0 * * * * (hourly)"
                      {...register("syncIntervalCron")}
                    />
                    {errors.syncIntervalCron && (
                      <p className="text-sm text-destructive">{errors.syncIntervalCron.message}</p>
                    )}
                  </div>
                  <Button type="submit" disabled={!isDirty || saving} className="rounded-2xl">
                    {saving ? "Saving…" : "Save configuration"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 2. Test connection */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle>Test connection</CardTitle>
              <CardDescription>Verify API connectivity and get latency and Odoo version</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={onTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Testing…
                  </>
                ) : (
                  <>
                    <Play className="size-4" />
                    Test connection
                  </>
                )}
              </Button>
              {testResult && (
                <div
                  className={cn(
                    "rounded-2xl border px-4 py-2 text-sm",
                    testResult.success
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                  )}
                >
                  {testResult.success ? (
                    <>
                      Connected. Latency: {testResult.latencyMs ?? "—"} ms
                      {testResult.odooVersion && ` · Odoo ${testResult.odooVersion}`}
                    </>
                  ) : (
                    testResult.error ?? "Connection failed"
                  )}
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

        {/* 4. Webhook config */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle>Webhook</CardTitle>
              <CardDescription>URL for Odoo to send events (read-only)</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-0 rounded-2xl border border-border bg-muted/30 px-4 py-2 font-mono text-sm truncate">
                {webhook?.url ?? "—"}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="rounded-2xl shrink-0"
                onClick={copyWebhookUrl}
                disabled={!webhook?.url}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
              {webhook && (
                <Badge variant={webhook.active ? "success" : "secondary"}>
                  {webhook.active ? "Active" : "Inactive"}
                </Badge>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 5. Logs panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
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
