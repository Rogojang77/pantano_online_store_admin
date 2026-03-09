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
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { AdminRouteGuard } from "@/components/guards/admin-route-guard";
import {
  faqService,
  type FaqSubmissionListItem,
  type FaqSubmissionStatus,
} from "@/services/faq.service";
import type { PaginatedResponse } from "@/types/api";
import { toast } from "sonner";

const STATUS_OPTIONS: FaqSubmissionStatus[] = ["NEW", "IN_PROGRESS", "ANSWERED"];
const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "outline"> = {
  NEW: "warning",
  IN_PROGRESS: "secondary",
  ANSWERED: "success",
};

function truncate(s: string, len: number) {
  if (s.length <= len) return s;
  return s.slice(0, len) + "…";
}

export default function FaqPage() {
  const [data, setData] = useState<PaginatedResponse<FaqSubmissionListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<FaqSubmissionListItem | null>(null);
  const [editStatus, setEditStatus] = useState<string>("NEW");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchFaq = useCallback(() => {
    setLoading(true);
    const params = {
      page: page + 1,
      limit,
      ...(statusFilter && { status: statusFilter }),
    };
    faqService
      .getSubmissions(params)
      .then(setData)
      .catch(() => {
        setData({
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        });
        toast.error("Failed to load FAQ submissions");
      })
      .finally(() => setLoading(false));
  }, [page, limit, statusFilter]);

  useEffect(() => {
    fetchFaq();
  }, [fetchFaq]);

  const openDetails = useCallback((item: FaqSubmissionListItem) => {
    setSelected(item);
    setEditStatus(item.status);
    setEditNotes(item.adminNotes ?? "");
    setDetailsOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await faqService.updateSubmission(selected.id, {
        status: editStatus as FaqSubmissionStatus,
        adminNotes: editNotes || undefined,
      });
      toast.success("Submission updated");
      setSelected((prev) =>
        prev ? { ...prev, status: editStatus, adminNotes: editNotes || null } : null
      );
      fetchFaq();
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  }, [selected, editStatus, editNotes, fetchFaq]);

  const columns: ColumnDef<FaqSubmissionListItem>[] = [
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
      accessorKey: "name",
      header: "Name",
      cell: ({ getValue }) => <span className="font-medium">{String(getValue())}</span>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }) => (
        <a
          href={`mailto:${getValue()}`}
          className="text-primary hover:underline"
        >
          {String(getValue())}
        </a>
      ),
    },
    {
      accessorKey: "question",
      header: "Question",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground max-w-[280px] block">
          {truncate(String(getValue()), 80)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const s = String(getValue());
        return (
          <Badge variant={statusVariant[s] ?? "secondary"}>
            {s.replace(/_/g, " ")}
          </Badge>
        );
      },
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
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: data?.meta.totalPages ?? 0,
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
          <h1 className="text-2xl font-semibold tracking-tight">FAQ submissions</h1>
          <p className="text-muted-foreground mt-1">
            Questions submitted from the storefront Întrebări frecvente form
          </p>
        </div>

        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>Filter by status</CardDescription>
            <div className="flex flex-wrap items-end gap-3 pt-2">
              <div>
                <Label className="text-xs">Status</Label>
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(0);
                  }}
                  className="mt-1 w-[160px] rounded-2xl"
                >
                  <option value="">All</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </div>
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
                            No FAQ submissions found
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

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>FAQ submission</DialogTitle>
              <DialogDescription>
                {selected?.name} · {selected?.email}
              </DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Question</Label>
                  <p className="mt-1 rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
                    {selected.question}
                  </p>
                </div>
                <div>
                  <Label htmlFor="faq-detail-status" className="text-xs">
                    Status
                  </Label>
                  <Select
                    id="faq-detail-status"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="mt-1 w-full rounded-2xl"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="faq-detail-notes" className="text-xs">
                    Admin notes
                  </Label>
                  <Textarea
                    id="faq-detail-notes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Internal notes..."
                    rows={3}
                    className="mt-1 w-full rounded-xl"
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button
                    className="rounded-xl"
                    disabled={saving}
                    onClick={handleSave}
                  >
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </AdminRouteGuard>
  );
}
