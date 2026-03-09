"use client";

import { useState, useEffect } from "react";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { productsService, type ProductListItem } from "@/services/products.service";
import type { PaginatedResponse } from "@/types/api";
import { cn } from "@/lib/utils";

export default function ProductsPage() {
  const [data, setData] = useState<PaginatedResponse<ProductListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(0);
  const limit = 10;

  useEffect(() => {
    setLoading(true);
    productsService
      .getList({ page: page + 1, limit })
      .then(setData)
      .catch(() => setData({ data: [], meta: { total: 0, page: 1, limit, totalPages: 0, hasNext: false, hasPrev: false } }))
      .finally(() => setLoading(false));
  }, [page]);

  const columns: ColumnDef<ProductListItem>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.sku}</p>
        </div>
      ),
    },
    {
      accessorKey: "slug",
      header: "Slug",
      cell: ({ getValue }) => (
        <span className="font-mono text-sm text-muted-foreground">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => (
        <Badge variant={getValue() === "ACTIVE" ? "success" : "secondary"}>
          {getValue() as string}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(getValue() as string).toLocaleDateString()}
        </span>
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
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="text-muted-foreground mt-1">
          Manage catalog products, variants, and media
        </p>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle>All products</CardTitle>
          <CardDescription>Paginated list with sorting</CardDescription>
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
                          No products yet
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
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-2 py-4">
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
    </motion.div>
  );
}
