"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { inventoryService, type InventoryListItem } from "@/services/inventory.service";
import { odooService } from "@/services/odoo.service";
import type { SyncState } from "@/types/odoo";
import type { PaginatedResponse } from "@/types/api";
import { useCanAccessAdminSection } from "@/hooks/use-role-guard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LOW_STOCK_THRESHOLD = 5;

export default function InventoryPage() {
  const isAdmin = useCanAccessAdminSection();
  const [data, setData] = useState<PaginatedResponse<InventoryListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncState | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchInventory = useCallback(() => {
    setLoading(true);
    inventoryService
      .getList({ page: page + 1, limit, ...(search.trim() && { search: search.trim() }) })
      .then(setData)
      .catch(() => {
        setData({
          data: [],
          meta: { total: 0, page: 1, limit, totalPages: 0, hasNext: false, hasPrev: false },
        });
        toast.error("Failed to load inventory");
      })
      .finally(() => setLoading(false));
  }, [page, limit, search]);

  const loadSyncStatus = useCallback(() => {
    odooService.getSyncStatus().then(setSyncStatus).catch(() => setSyncStatus({ status: "IDLE" }));
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    loadSyncStatus();
  }, [loadSyncStatus]);

  const handleSync = useCallback(() => {
    if (!isAdmin) return;
    setSyncing(true);
    inventoryService
      .sync()
      .then((res) => {
        const p = res?.products ?? { synced: 0, failed: 0 };
        const v = res?.variants ?? { synced: 0, failed: 0 };
        toast.success(`Synced: ${p.synced + v.synced} products/variants`);
        fetchInventory();
        loadSyncStatus();
      })
      .catch(() => toast.error("Sync failed"))
      .finally(() => setSyncing(false));
  }, [isAdmin, fetchInventory, loadSyncStatus]);

  const statusLabel =
    syncStatus?.status === "RUNNING"
      ? "Syncing..."
      : syncStatus?.status === "SUCCESS"
        ? "Up to date"
        : syncStatus?.status === "FAILED"
          ? "Last sync failed"
          : "Sync status from Odoo";
  const statusVariant =
    syncStatus?.status === "SUCCESS"
      ? "success"
      : syncStatus?.status === "FAILED"
        ? "destructive"
        : "outline";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground mt-1">
          Stock, reserved, and available quantities. {isAdmin ? "Admins can run manual sync." : "View only."}
        </p>
      </div>

      {/* Sync status card */}
      <Card className="rounded-2xl border-border/60">
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {syncStatus?.status === "RUNNING" || syncing ? (
              <RefreshCw className="size-5 animate-spin text-primary" />
            ) : syncStatus?.status === "SUCCESS" ? (
              <CheckCircle2 className="size-5 text-emerald-500" />
            ) : (
              <AlertCircle className="size-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">Last Odoo sync</p>
              <p className="text-sm text-muted-foreground">{statusLabel}</p>
              {syncStatus?.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  {new Date(syncStatus.lastSyncAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant}>
              {syncStatus?.status === "SUCCESS" ? "Synced" : syncStatus?.status === "FAILED" ? "Failed" : "—"}
            </Badge>
            {isAdmin && (
              <Button
                size="sm"
                className="rounded-xl"
                onClick={handleSync}
                disabled={syncing || syncStatus?.status === "RUNNING"}
              >
                <RefreshCw className={cn("size-4 mr-2", (syncing || syncStatus?.status === "RUNNING") && "animate-spin")} />
                Sync now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Stock overview</CardTitle>
              <CardDescription>
                Stock, reserved, available, and last sync. Search by SKU or product name.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by SKU or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-2xl pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-border/60">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 font-medium text-muted-foreground">Product</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">SKU</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Stock</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Reserved</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Available</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Last sync</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data?.data?.length ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                          No inventory data. Run a sync from Odoo Integration (Admin).
                        </td>
                      </tr>
                    ) : (
                      data.data.map((r) => (
                        <tr
                          key={r.productId}
                          className={cn(
                            "border-b border-border/60 transition-colors hover:bg-muted/30",
                            r.availableQuantity <= 0 && "bg-destructive/5",
                            r.availableQuantity > 0 &&
                              r.availableQuantity <= LOW_STOCK_THRESHOLD &&
                              "bg-amber-500/5"
                          )}
                        >
                          <td className="px-4 py-3 font-medium">{r.productName}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{r.sku}</td>
                          <td className="px-4 py-3">{r.stockQuantity}</td>
                          <td className="px-4 py-3">{r.reservedQuantity}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                r.availableQuantity <= 0 && "font-medium text-destructive",
                                r.availableQuantity > 0 &&
                                  r.availableQuantity <= LOW_STOCK_THRESHOLD &&
                                  "font-medium text-amber-700 dark:text-amber-400"
                              )}
                            >
                              {r.availableQuantity}
                            </span>
                            {r.availableQuantity <= LOW_STOCK_THRESHOLD && (
                              <Badge
                                variant={r.availableQuantity <= 0 ? "destructive" : "warning"}
                                className="ml-2"
                              >
                                {r.availableQuantity <= 0 ? "Out of stock" : "Low stock"}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {r.lastSyncedAt
                              ? new Date(r.lastSyncedAt).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {data && data.meta.totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-4 px-2 py-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {data.meta.totalPages} · {data.meta.total} total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={!data.meta.hasPrev}
                    >
                      <ChevronLeft className="size-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!data.meta.hasNext}
                    >
                      Next
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
