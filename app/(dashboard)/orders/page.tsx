"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from "@tanstack/react-table";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Search, Eye, Printer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import {
  ordersService,
  type OrderListItem,
  type OrderStatus,
  type OrderType,
} from "@/services/orders.service";
import type { PaginatedResponse } from "@/types/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "READY_FOR_PICKUP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const statusVariant: Record<OrderStatus, "default" | "secondary" | "success" | "destructive" | "warning" | "outline"> = {
  PENDING: "warning",
  CONFIRMED: "secondary",
  READY_FOR_PICKUP: "default",
  SHIPPED: "secondary",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

function formatMoney(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  return Number.isNaN(n) ? "—" : new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(n);
}

export default function OrdersPage() {
  const [data, setData] = useState<PaginatedResponse<OrderListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(0);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const params = {
      page: page + 1,
      limit,
      ...(statusFilter && { status: statusFilter }),
      ...(typeFilter && { type: typeFilter }),
      ...(fromDate && { from: fromDate }),
      ...(toDate && { to: toDate }),
      ...(search.trim() && { search: search.trim() }),
    };
    ordersService
      .getList(params)
      .then(setData)
      .catch(() => {
        setData({ data: [], meta: { total: 0, page: 1, limit, totalPages: 0, hasNext: false, hasPrev: false } });
        toast.error("Failed to load orders");
      })
      .finally(() => setLoading(false));
  }, [page, limit, statusFilter, typeFilter, fromDate, toDate, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openDetails = useCallback((order: OrderListItem) => {
    setDetailLoading(true);
    setDetailsOpen(true);
    ordersService
      .getById(order.id)
      .then((full) => {
        setSelectedOrder(full);
      })
      .catch(() => {
        setSelectedOrder(order);
        toast.error("Could not load full order details");
      })
      .finally(() => setDetailLoading(false));
  }, []);

  const handleStatusChange = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      setStatusUpdating(true);
      try {
        await ordersService.updateStatus(orderId, newStatus);
        toast.success("Status updated");
        setSelectedOrder((prev) => (prev?.id === orderId ? { ...prev, status: newStatus } : prev));
        fetchOrders();
      } catch {
        toast.error("Failed to update status");
      } finally {
        setStatusUpdating(false);
      }
    },
    [fetchOrders]
  );

  const columns: ColumnDef<OrderListItem>[] = [
    {
      accessorKey: "orderNumber",
      header: "Order #",
      cell: ({ row }) => (
        <button
          type="button"
          className="font-mono font-medium text-primary hover:underline"
          onClick={() => openDetails(row.original)}
        >
          {row.original.orderNumber}
        </button>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ getValue }) => (
        <Badge variant="outline">{(getValue() as OrderType) === "DELIVERY" ? "Delivery" : "Reservation"}</Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => (
        <Badge variant={statusVariant[getValue() as OrderStatus] ?? "secondary"}>
          {(getValue() as string).replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: ({ row }) => {
        const u = row.original.user;
        return (
          <span className="text-muted-foreground">
            {u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => formatMoney(row.original.total),
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">
          {new Date(getValue() as string).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-xl"
          onClick={() => openDetails(row.original)}
          aria-label="View details"
        >
          <Eye className="size-4" />
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-1">View and manage orders</p>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle>All orders</CardTitle>
          <CardDescription>Filter by status, type, date range, or search by order number / customer</CardDescription>
          <div className="flex flex-wrap items-end gap-3 pt-2">
            <div className="relative w-full min-w-[180px] sm:w-48">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-2xl pl-9"
              />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 w-[160px] rounded-2xl"
              >
                <option value="">All</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="mt-1 w-[140px] rounded-2xl"
              >
                <option value="">All</option>
                <option value="DELIVERY">Delivery</option>
                <option value="RESERVATION">Reservation</option>
              </Select>
            </div>
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
                          No orders found
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

      {/* Order details dialog (print-friendly when printed) */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg print:max-w-none print:shadow-none">
          <DialogHeader className="print:block">
            <DialogTitle className="print:text-lg">
              Order {selectedOrder?.orderNumber ?? "—"}
            </DialogTitle>
            <DialogDescription className="print:text-sm">
              {selectedOrder?.createdAt
                ? new Date(selectedOrder.createdAt).toLocaleString()
                : ""}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : selectedOrder ? (
            <div className="space-y-4 print:text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant={statusVariant[selectedOrder.status] ?? "secondary"}>
                  {selectedOrder.status.replace(/_/g, " ")}
                </Badge>
                <Badge variant="outline">{selectedOrder.type}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Customer</p>
                <p className="font-medium">
                  {selectedOrder.user
                    ? [selectedOrder.user.firstName, selectedOrder.user.lastName].filter(Boolean).join(" ") ||
                      selectedOrder.user.email
                    : "—"}
                </p>
                {selectedOrder.user?.email && (
                  <p className="text-muted-foreground text-sm">{selectedOrder.user.email}</p>
                )}
              </div>
              {(selectedOrder.addressLine1 || selectedOrder.city) && (
                <div>
                  <p className="text-muted-foreground text-xs">Delivery address</p>
                  <p>
                    {[selectedOrder.addressLine1, selectedOrder.addressLine2, selectedOrder.city, selectedOrder.postalCode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground text-xs">Subtotal</p>
                  <p>{formatMoney(selectedOrder.subtotal)}</p>
                </div>
                {selectedOrder.deliveryFee != null && Number(selectedOrder.deliveryFee) !== 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs">Delivery fee</p>
                    <p>{formatMoney(selectedOrder.deliveryFee)}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs">Total</p>
                  <p className="font-medium">{formatMoney(selectedOrder.total)}</p>
                </div>
                {selectedOrder.weightTotal != null && (
                  <div>
                    <p className="text-muted-foreground text-xs">Weight</p>
                    <p>{String(selectedOrder.weightTotal)} kg</p>
                  </div>
                )}
              </div>
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Items</p>
                  <ul className="list-inside list-disc space-y-0.5">
                    {selectedOrder.items.map((item) => (
                      <li key={item.id}>
                        {item.variant?.product?.name ?? item.variant?.name ?? "Item"} × {item.quantity} —{" "}
                        {formatMoney(item.totalPrice)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <Label className="text-xs">Change status</Label>
                <Select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)}
                  disabled={statusUpdating}
                  className="mt-1 w-full rounded-2xl"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </Select>
              </div>
            </div>
          ) : null}
          <DialogFooter className="print:hidden">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => window.print()}
            >
              <Printer className="size-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
