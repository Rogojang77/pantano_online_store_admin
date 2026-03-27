"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AxiosError } from "axios";
import { motion } from "framer-motion";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { TablePagination } from "@/components/ui/table-pagination";
import { inventoryService, type InventoryListItem } from "@/services/inventory.service";
import { odooService } from "@/services/odoo.service";
import type { SyncState } from "@/types/odoo";
import type { PaginatedResponse } from "@/types/api";
import { useCanAccessAdminSection } from "@/hooks/use-role-guard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ListFetchError } from "@/components/list-fetch-error";

const LOW_STOCK_THRESHOLD = 5;

export default function InventoryPage() {
  const isAdmin = useCanAccessAdminSection();
  const [data, setData] = useState<PaginatedResponse<InventoryListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [limit] = useState(15);
  const [searchInput, setSearchInput] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [stockStatus, setStockStatus] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [sortBy, setSortBy] = useState<"productName" | "ean" | "stockQuantity" | "reservedQuantity" | "lastSyncedAt">("lastSyncedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [syncStatus, setSyncStatus] = useState<SyncState | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newStock, setNewStock] = useState<Record<string, number | "">>({});
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchDebounced(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [searchDebounced, stockStatus, sortBy, sortDir]);

  const fetchInventory = useCallback(() => {
    const isInitialLoad = !hasLoadedRef.current;
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    inventoryService
      .getList({
        page: page + 1,
        limit,
        ...(searchDebounced && { search: searchDebounced }),
        ...(stockStatus !== "all" && { stockStatus }),
        ...(sortBy !== "lastSyncedAt" && { sortBy }),
        ...(sortDir !== "desc" && { sortDir }),
      })
      .then((response) => {
        setData(response);
        setLoadError(false);
      })
      .catch(() => {
        if (!hasLoadedRef.current) {
          setData(null);
        }
        setLoadError(true);
        toast.error("Failed to load inventory");
      })
      .finally(() => {
        hasLoadedRef.current = true;
        setLoading(false);
        setIsRefreshing(false);
      });
  }, [page, limit, searchDebounced, stockStatus, sortBy, sortDir]);

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

  const handleStockChange = (productId: string, value: string) => {
    const num = value === "" ? "" : Number(value);
    if (num !== "" && Number.isNaN(num)) return;
    setNewStock((prev) => ({ ...prev, [productId]: num }));
  };

  const handleStockSave = async (productId: string) => {
    const value = newStock[productId];
    if (value === "" || value == null) return;
    setUpdatingId(productId);
    try {
      await inventoryService.setProductStock(productId, Number(value));
      toast.success("Stock updated and synced to Odoo");
      fetchInventory();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update stock in Odoo"));
    } finally {
      setUpdatingId(null);
    }
  };

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
                Stock, reserved, available, and last sync. Search by EAN or product name.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by EAN or name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
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
              {loadError && (
                <div className="mb-4">
                  <ListFetchError message="Could not load inventory." onRetry={fetchInventory} />
                </div>
              )}
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Select
                  className="rounded-2xl"
                  value={stockStatus}
                  onChange={(e) => setStockStatus(e.target.value as "all" | "in_stock" | "low_stock" | "out_of_stock")}
                >
                  <option value="all">All stock states</option>
                  <option value="in_stock">In stock (&gt; 5)</option>
                  <option value="low_stock">Low stock (1-5)</option>
                  <option value="out_of_stock">Out of stock (0)</option>
                </Select>
                <Select
                  className="rounded-2xl"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as "productName" | "ean" | "stockQuantity" | "reservedQuantity" | "lastSyncedAt"
                    )
                  }
                >
                  <option value="lastSyncedAt">Sort by last sync</option>
                  <option value="productName">Sort by product name</option>
                  <option value="ean">Sort by EAN</option>
                  <option value="stockQuantity">Sort by stock qty</option>
                  <option value="reservedQuantity">Sort by reserved qty</option>
                </Select>
                <Select
                  className="rounded-2xl"
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
                >
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </Select>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-border/60">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 font-medium text-muted-foreground">Product</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">EAN</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Stock</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Reserved</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Available</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">Edit stock</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Last sync</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data?.data?.length ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
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
                          <td className="px-4 py-3 font-mono text-muted-foreground">{r.ean}</td>
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
                          <td className="px-4 py-3 text-right">
                            {isAdmin ? (
                              <div className="flex items-center justify-end gap-2">
                                <Input
                                  type="number"
                                  className="h-8 w-20 rounded-xl text-right"
                                  value={newStock[r.productId] ?? r.stockQuantity}
                                  onChange={(e) => handleStockChange(r.productId, e.target.value)}
                                />
                                <Button
                                  size="icon"
                                  className="h-8 w-8 rounded-xl"
                                  disabled={updatingId === r.productId}
                                  onClick={() => handleStockSave(r.productId)}
                                >
                                  <CheckCircle2 className={cn("size-4", updatingId === r.productId && "animate-pulse")} />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">View only</span>
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
                  <div className="flex items-center gap-3">
                    {isRefreshing && (
                      <span className="text-xs text-muted-foreground">Updating...</span>
                    )}
                    <TablePagination
                      page={page}
                      totalPages={data.meta.totalPages}
                      onPageChange={setPage}
                    />
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

function getErrorMessage(error: unknown, fallback: string): string {
  const responseMessage = (error as AxiosError<{ message?: string | string[] }>)?.response?.data?.message;
  if (Array.isArray(responseMessage)) {
    return responseMessage.join(", ");
  }
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }
  return fallback;
}
