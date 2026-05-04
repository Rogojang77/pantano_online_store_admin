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
import { Search, Archive, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { TablePagination } from "@/components/ui/table-pagination";
import type { ProductListItem } from "@/services/products.service";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useProductList,
  useCategoriesQuery,
  useBrandsQuery,
  useDeleteProduct,
  useArchiveProduct,
  useBulkArchiveProducts,
} from "./_hooks/use-product-queries";
import { notifyApiError } from "@/lib/notify-api-error";

export default function ProductsPage() {
  const router = useRouter();

  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "ean" | "updatedAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bulkCategoryIds, setBulkCategoryIds] = useState<string[]>([]);
  const [bulkBrandIds, setBulkBrandIds] = useState<string[]>([]);
  const [bulkIncludeSubcategories, setBulkIncludeSubcategories] = useState(false);
  const limit = 10;

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchDebounced(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [searchDebounced, statusFilter, categoryFilter, brandFilter, sortBy, sortDir]);

  const { data, isLoading: loading } = useProductList({
    page: page + 1,
    limit,
    search: searchDebounced || undefined,
    status: statusFilter || undefined,
    categoryId: categoryFilter || undefined,
    brandId: brandFilter || undefined,
    sortBy,
    sortDir,
  });

  const { data: categories = [] } = useCategoriesQuery();
  const { data: brands = [] } = useBrandsQuery();

  const archiveMutation = useArchiveProduct();
  const deleteMutation = useDeleteProduct();
  const bulkArchiveMutation = useBulkArchiveProducts();

  const handleArchive = useCallback(async (id: string, name: string) => {
    if (!window.confirm(`Archive "${name}"? It will be hidden from active listings.`)) return;
    setActionLoadingId(id);
    try {
      await archiveMutation.mutateAsync(id);
      toast.success(`"${name}" archived`);
    } catch (error) {
      notifyApiError(error, "Failed to archive product");
    } finally {
      setActionLoadingId(null);
    }
  }, [archiveMutation]);

  const handleBulkArchiveFromStorefront = useCallback(async () => {
    if (bulkCategoryIds.length === 0 && bulkBrandIds.length === 0) {
      toast.error("Alege cel puțin o categorie sau un brand.");
      return;
    }
    const catNames = bulkCategoryIds
      .map((id) => categories.find((c) => c.id === id)?.name)
      .filter((n): n is string => Boolean(n));
    const brandNames = bulkBrandIds
      .map((id) => brands.find((b) => b.id === id)?.name)
      .filter((n): n is string => Boolean(n));

    const formatNames = (names: string[], label: string) => {
      if (names.length === 0) return "";
      const head = names.slice(0, 4).map((n) => `„${n}”`).join(", ");
      const rest =
        names.length > 4 ? `, … (+${names.length - 4} ${label} în plus)` : "";
      return head + rest;
    };

    const parts: string[] = [];
    if (catNames.length) {
      parts.push(
        `${catNames.length} ${catNames.length === 1 ? "categorie" : "categorii"}: ${formatNames(catNames, "categorii")}${
          bulkIncludeSubcategories ? " (inclusiv subcategorii active, pe fiecare categorie rădăcină selectată)" : ""
        }`
      );
    }
    if (brandNames.length) {
      parts.push(
        `${brandNames.length} ${brandNames.length === 1 ? "brand" : "branduri"}: ${formatNames(brandNames, "branduri")}`
      );
    }
    const summary = parts.join(". ");
    if (
      !window.confirm(
        `Produsele ACTIVE care corespund: ${summary}. Vor fi arhivate și nu vor mai apărea pe site. Continui?`
      )
    ) {
      return;
    }
    try {
      const res = await bulkArchiveMutation.mutateAsync({
        ...(bulkCategoryIds.length > 0 ? { categoryIds: bulkCategoryIds } : {}),
        ...(bulkBrandIds.length > 0 ? { brandIds: bulkBrandIds } : {}),
        ...(bulkCategoryIds.length > 0 && bulkIncludeSubcategories
          ? { includeCategoryDescendants: true }
          : {}),
      });
      toast.success(
        res.archivedCount === 0
          ? "Niciun produs activ nu a corespuns criteriilor."
          : `${res.archivedCount} produse au fost ascunse de pe site (arhivate).`
      );
    } catch (error) {
      notifyApiError(error, "Arhivarea în masă a eșuat.");
    }
  }, [
    bulkCategoryIds,
    bulkBrandIds,
    bulkIncludeSubcategories,
    bulkArchiveMutation,
    categories,
    brands,
  ]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    setActionLoadingId(id);
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(`"${name}" deleted`);
    } catch (error) {
      notifyApiError(error, "Failed to delete product");
    } finally {
      setActionLoadingId(null);
    }
  }, [deleteMutation]);

  const columns: ColumnDef<ProductListItem>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.ean || row.original.sku}</p>
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
      cell: ({ getValue }) => {
        const status = getValue() as string;
        const variant = status === "ACTIVE" ? "success" : status === "ARCHIVED" ? "destructive" : "secondary";
        return <Badge variant={variant}>{status}</Badge>;
      },
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
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const product = row.original;
        const isLoading = actionLoadingId === product.id;
        return (
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => router.push(`/products/${product.id}`)}
            >
              Edit
            </Button>
            {product.status !== "ARCHIVED" && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => handleArchive(product.id, product.name)}
                disabled={isLoading}
                title="Archive"
              >
                <Archive className="size-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-red-500 hover:text-red-600"
              onClick={() => handleDelete(product.id, product.name)}
              disabled={isLoading}
              title="Delete"
            >
              <Trash2 className="size-3.5" />
            </Button>
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
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="text-muted-foreground mt-1">
          Manage catalog products, variants, and media
        </p>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>All products</CardTitle>
            <CardDescription>Paginated list with filters and sorting</CardDescription>
          </div>
          <Button
            size="sm"
            className="rounded-xl"
            onClick={() => router.push("/products/new")}
          >
            Add product
          </Button>
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
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-6">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, EAN, or SKU..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="rounded-2xl pl-9"
                  />
                </div>
                <Select
                  className="rounded-2xl"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </Select>
                <SearchableSelect
                  className="rounded-2xl"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  options={categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                    keywords: [c.normalizedName ?? "", c.slug ?? ""],
                  }))}
                  placeholder="All categories"
                  searchPlaceholder="Search categories..."
                />
                <SearchableSelect
                  className="rounded-2xl"
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  options={brands.map((b) => ({
                    value: b.id,
                    label: b.name,
                    keywords: [b.slug],
                  }))}
                  placeholder="All brands"
                  searchPlaceholder="Search brands..."
                />
                <div className="flex gap-2">
                  <Select
                    className="rounded-2xl"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "createdAt" | "name" | "ean" | "updatedAt")}
                  >
                    <option value="createdAt">Sort by created</option>
                    <option value="updatedAt">Sort by updated</option>
                    <option value="name">Sort by name</option>
                    <option value="ean">Sort by EAN</option>
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
              </div>
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
                  Page {page + 1} of {data?.meta.totalPages || 1} &middot; {data?.meta.total ?? 0} total
                </p>
                <TablePagination
                  page={page}
                  totalPages={data?.meta.totalPages ?? 0}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle>Ascunde de pe site (în masă)</CardTitle>
          <CardDescription>
            Arhivează toate produsele <strong>ACTIVE</strong> care se potrivesc criteriilor. Nu afectează
            ciorne (DRAFT). Dacă selectezi categorii: produsul trebuie să fie în oricare dintre ele.
            Dacă selectezi branduri: oricare dintre ele. Dacă selectezi ambele: categoria
            (expandată) și brandul.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Categorii (opțional)</p>
              <SearchableMultiSelect
                className="rounded-2xl"
                value={bulkCategoryIds}
                onValueChange={setBulkCategoryIds}
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                  keywords: [c.normalizedName ?? "", c.slug ?? ""],
                }))}
                placeholder="Adaugă categorii…"
                searchPlaceholder="Caută categorii…"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Branduri (opțional)</p>
              <SearchableMultiSelect
                className="rounded-2xl"
                value={bulkBrandIds}
                onValueChange={setBulkBrandIds}
                options={brands.map((b) => ({
                  value: b.id,
                  label: b.name,
                  keywords: [b.slug],
                }))}
                placeholder="Adaugă branduri…"
                searchPlaceholder="Caută branduri…"
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={bulkIncludeSubcategories}
              onChange={(e) => setBulkIncludeSubcategories(e.target.checked)}
              disabled={bulkCategoryIds.length === 0}
            />
            Include subcategorii active (pentru fiecare categorie rădăcină selectată)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={bulkArchiveMutation.isPending}
              onClick={handleBulkArchiveFromStorefront}
            >
              {bulkArchiveMutation.isPending ? "Se procesează…" : "Arhivează produsele potrivite"}
            </Button>
            {(bulkCategoryIds.length > 0 || bulkBrandIds.length > 0) && (
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl"
                onClick={() => {
                  setBulkCategoryIds([]);
                  setBulkBrandIds([]);
                  setBulkIncludeSubcategories(false);
                }}
              >
                Resetează filtre
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
