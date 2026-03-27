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
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminRouteGuard } from "@/components/guards/admin-route-guard";
import {
  newsletterService,
  type NewsletterSubscriberListItem,
  type NewsletterSubscriberStatus,
} from "@/services/newsletter.service";
import { toast } from "sonner";
import { ListFetchError } from "@/components/list-fetch-error";

const STATUS_OPTIONS: NewsletterSubscriberStatus[] = ["PENDING", "SUBSCRIBED", "UNSUBSCRIBED"];
const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "outline"> = {
  PENDING: "warning",
  SUBSCRIBED: "success",
  UNSUBSCRIBED: "secondary",
};

export default function NewsletterPage() {
  const [data, setData] = useState<{ data: NewsletterSubscriberListItem[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchSubscribers = useCallback(() => {
    setLoading(true);
    const params: { page: number; limit: number; status?: string; search?: string } = {
      page,
      limit,
    };
    if (statusFilter) params.status = statusFilter;
    if (searchDebounced.trim()) params.search = searchDebounced.trim();
    newsletterService
      .getSubscribers(params)
      .then((response) => {
        setData(response);
        setLoadError(false);
      })
      .catch(() => {
        setData(null);
        setLoadError(true);
        toast.error("Failed to load newsletter subscribers");
      })
      .finally(() => setLoading(false));
  }, [page, limit, statusFilter, searchDebounced]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await newsletterService.exportCsv(statusFilter || undefined);
      toast.success("CSV exported");
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setExporting(false);
    }
  }, [statusFilter]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const columns: ColumnDef<NewsletterSubscriberListItem>[] = [
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {new Date(getValue() as string).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }) => (
        <a href={`mailto:${getValue()}`} className="text-primary hover:underline">
          {String(getValue())}
        </a>
      ),
    },
    {
      accessorKey: "firstName",
      header: "First name",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      accessorKey: "lastName",
      header: "Last name",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const s = String(getValue());
        return (
          <Badge variant={statusVariant[s] ?? "secondary"}>{s.replace(/_/g, " ")}</Badge>
        );
      },
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-xs">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      accessorKey: "confirmedAt",
      header: "Confirmed",
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        return (
          <span className="text-muted-foreground text-xs">
            {v ? new Date(v).toLocaleDateString() : "—"}
          </span>
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
    pageCount: totalPages,
  });

  return (
    <AdminRouteGuard>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Newsletter subscribers</h1>
          <p className="text-muted-foreground mt-1">
            Subscribers collected via homepage, checkout, and account (double opt-in). Export for marketing platform.
          </p>
        </div>

        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle>Subscribers</CardTitle>
            <CardDescription>Filter and export</CardDescription>
            <div className="flex flex-wrap items-end gap-3 pt-2">
              <div>
                <Label className="text-xs">Status</Label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="mt-1 h-9 w-[160px] rounded-2xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">All</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Search email</Label>
                <Input
                  type="search"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="mt-1 w-[200px] rounded-2xl"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={handleExport}
                disabled={exporting}
              >
                <Download className="size-4 mr-2" />
                {exporting ? "Exporting…" : "Export CSV"}
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
              <ListFetchError message="Could not load newsletter subscribers." onRetry={fetchSubscribers} />
            ) : (
              <>
                <div className="overflow-x-auto rounded-2xl border border-border/60">
                  <table className="w-full text-left text-sm">
                    <thead>
                      {table.getHeaderGroups().map((hg) => (
                        <tr key={hg.id} className="border-b border-border bg-muted/40">
                          {hg.headers.map((h) => (
                            <th
                              key={h.id}
                              className="px-4 py-3 font-medium text-muted-foreground"
                            >
                              {flexRender(h.column.columnDef.header, h.getContext())}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={columns.length}
                            className="px-4 py-12 text-center text-muted-foreground"
                          >
                            No subscribers found
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
                    Page {page} of {totalPages} · {data?.total ?? 0} total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!hasPrev}
                    >
                      <ChevronLeft className="size-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasNext}
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
      </motion.div>
    </AdminRouteGuard>
  );
}
