"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Eye, PackageCheck, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { reservationsService, type ReservationListItem } from "@/services/reservations.service";
import { ordersService, type OrderStatus } from "@/services/orders.service";
import type { PaginatedResponse } from "@/types/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ListFetchError } from "@/components/list-fetch-error";

const statusVariant: Record<string, "default" | "secondary" | "success" | "destructive" | "warning"> = {
  PENDING: "warning",
  CONFIRMED: "secondary",
  READY_FOR_PICKUP: "success",
  SHIPPED: "secondary",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export default function ReservationsPage() {
  const [data, setData] = useState<PaginatedResponse<ReservationListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(0);
  const [limit] = useState(10);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<ReservationListItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [pendingCancelOrderId, setPendingCancelOrderId] = useState<string | null>(null);

  const fetchReservations = useCallback(() => {
    setLoading(true);
    const params = {
      page: page + 1,
      limit,
      ...(fromDate && { from: fromDate }),
      ...(toDate && { to: toDate }),
    };
    reservationsService
      .getList(params)
      .then((response) => {
        setData(response);
        setLoadError(false);
      })
      .catch(() => {
        setData(null);
        setLoadError(true);
        toast.error("Failed to load reservations");
      })
      .finally(() => setLoading(false));
  }, [page, limit, fromDate, toDate]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const openDetails = useCallback((res: ReservationListItem) => {
    setSelected(res);
    setDetailsOpen(true);
  }, []);

  const setOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      setActionLoading(true);
      try {
        await ordersService.updateStatus(orderId, status);
        toast.success(status === "READY_FOR_PICKUP" ? "Marked ready for pickup" : "Order cancelled");
        setSelected((prev) => {
          if (!prev || prev.orderId !== orderId) return prev;
          return { ...prev, order: { ...prev.order!, status } };
        });
        fetchReservations();
      } catch {
        toast.error("Failed to update");
      } finally {
        setActionLoading(false);
      }
    },
    [fetchReservations]
  );

  const requestCancelOrder = useCallback((orderId: string) => {
    setPendingCancelOrderId(orderId);
    setCancelConfirmOpen(true);
  }, []);

  const confirmCancelOrder = useCallback(async () => {
    if (!pendingCancelOrderId) return;
    await setOrderStatus(pendingCancelOrderId, "CANCELLED");
    setCancelConfirmOpen(false);
    setPendingCancelOrderId(null);
  }, [pendingCancelOrderId, setOrderStatus]);

  const columns: ColumnDef<ReservationListItem>[] = [
    {
      id: "orderNumber",
      header: "Order #",
      cell: ({ row }) => (
        <button
          type="button"
          className="font-mono font-medium text-primary hover:underline"
          onClick={() => openDetails(row.original)}
        >
          {row.original.order?.orderNumber ?? row.original.orderId}
        </button>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: ({ row }) => {
        const u = row.original.user ?? row.original.order?.user;
        return (
          <span className="text-muted-foreground">
            {u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email : "—"}
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.order?.status ?? "PENDING";
        return (
          <Badge variant={statusVariant[status] ?? "secondary"}>
            {String(status).replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "pickupUntil",
      header: "Pickup until",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">
          {getValue() ? new Date(getValue() as string).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">
          {new Date(getValue() as string).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const status = row.original.order?.status;
        const orderId = row.original.orderId;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-xl"
              onClick={() => openDetails(row.original)}
              aria-label="View details"
            >
              <Eye className="size-4" />
            </Button>
            {status !== "READY_FOR_PICKUP" && status !== "CANCELLED" && orderId && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-xl text-emerald-600"
                  onClick={() => setOrderStatus(orderId, "READY_FOR_PICKUP")}
                  aria-label="Ready for pickup"
                >
                  <PackageCheck className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-xl text-destructive"
                  onClick={() => requestCancelOrder(orderId)}
                  aria-label="Cancel"
                >
                  <X className="size-4" />
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: data?.meta.totalPages ?? 0,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reservations</h1>
        <p className="text-muted-foreground mt-1">In-store pickup reservations</p>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle>Reservations</CardTitle>
          <CardDescription>Filter by date range</CardDescription>
          <div className="flex flex-wrap items-end gap-3 pt-2">
            <div>
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1 w-[140px] rounded-2xl"
              />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1 w-[140px] rounded-2xl"
              />
            </div>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setPage(0)}>
              Apply
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : loadError ? (
            <ListFetchError message="Could not load reservations." onRetry={fetchReservations} />
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-border/60">
                <table className="w-full text-left text-sm">
                  <thead>
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id} className="border-b border-border bg-muted/40">
                        {hg.headers.map((h) => (
                          <th key={h.id} className="px-4 py-3 font-medium text-muted-foreground">
                            {flexRender(h.column.columnDef.header, h.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                          No reservations found
                        </td>
                      </tr>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-border/60 transition-colors hover:bg-muted/30"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-4 py-3">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 px-2 py-4">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} of {data?.meta.totalPages || 1} · {data?.meta.total ?? 0} total
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={!data?.meta.hasPrev}
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data?.meta.hasNext}
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Details modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reservation details</DialogTitle>
            <DialogDescription>
              {selected?.order?.orderNumber ?? selected?.id}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <Badge variant={statusVariant[selected.order?.status ?? ""] ?? "secondary"}>
                  {(selected.order?.status ?? "PENDING").replace(/_/g, " ")}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Customer</p>
                <p className="font-medium">
                  {selected.user
                    ? [selected.user.firstName, selected.user.lastName].filter(Boolean).join(" ") ||
                      selected.user.email
                    : "—"}
                </p>
                {selected.user?.phone && (
                  <p className="text-muted-foreground text-sm">{selected.user.phone}</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Pickup until</p>
                <p>{selected.pickupUntil ? new Date(selected.pickupUntil).toLocaleString() : "—"}</p>
              </div>
              {selected.order?.items && selected.order.items.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Items</p>
                  <ul className="list-inside list-disc space-y-0.5">
                    {selected.order.items.map((item, i) => (
                      <li key={i}>
                        {item.variant?.product?.name ?? "Item"} × {item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selected.order?.status !== "READY_FOR_PICKUP" &&
                selected.order?.status !== "CANCELLED" &&
                selected.orderId && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="rounded-xl"
                      disabled={actionLoading}
                      onClick={() => setOrderStatus(selected.orderId, "READY_FOR_PICKUP")}
                    >
                      <PackageCheck className="size-4 mr-2" />
                      Ready for pickup
                    </Button>
                    <Button
                      variant="destructive"
                      className="rounded-xl"
                      disabled={actionLoading}
                      onClick={() => requestCancelOrder(selected.orderId)}
                    >
                      <X className="size-4 mr-2" />
                      Cancel reservation
                    </Button>
                  </div>
                )}
              <DialogFooter className="pt-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setDetailsOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={cancelConfirmOpen}
        onOpenChange={(open) => {
          setCancelConfirmOpen(open);
          if (!open) {
            setPendingCancelOrderId(null);
          }
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel reservation?</DialogTitle>
            <DialogDescription>
              This sets the related order status to CANCELLED. Confirm only if this reservation should no
              longer be fulfilled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setCancelConfirmOpen(false);
                setPendingCancelOrderId(null);
              }}
            >
              Keep reservation
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={() => void confirmCancelOrder()}
              disabled={actionLoading || !pendingCancelOrderId}
            >
              {actionLoading ? "Cancelling..." : "Confirm cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
