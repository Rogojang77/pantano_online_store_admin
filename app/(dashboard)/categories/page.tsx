"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Loader2,
  Search,
  Eye,
  EyeOff,
  GitMerge,
  AlertTriangle,
  Copy,
  ExternalLink,
  RefreshCw,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { categoriesService, type CategoryItem, type CreateCategoryPayload } from "@/services/categories.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useVirtualizer, VirtualItem } from "@tanstack/react-virtual";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),
  parentId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  isVisibleInMenu: z.boolean().optional(),
  sortOrder: z.number().optional(),
  iconName: z.string().optional(),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

interface ExtendedCategory extends CategoryItem {
  isVisibleInMenu?: boolean;
  productCount?: number;
  normalizedName?: string;
  children?: ExtendedCategory[];
}

interface DuplicateGroup {
  normalizedName: string;
  categories: {
    id: string;
    name: string;
    slug: string;
    level: number;
    parentId: string | null;
    parentName: string | null;
    productCount: number;
  }[];
}

function buildTree(flat: ExtendedCategory[]): ExtendedCategory[] {
  const map = new Map<string, ExtendedCategory>();
  flat.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: ExtendedCategory[] = [];
  flat.forEach((c) => {
    const node = map.get(c.id)!;
    if (!c.parentId) roots.push(node);
    else {
      const parent = map.get(c.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  });
  const sortNodes = (nodes: ExtendedCategory[]) => {
    nodes.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    nodes.forEach((n) => n.children && sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

function flattenTree(nodes: ExtendedCategory[], depth = 0): (ExtendedCategory & { depth: number })[] {
  const result: (ExtendedCategory & { depth: number })[] = [];
  for (const node of nodes) {
    result.push({ ...node, depth });
    if (node.children && node.children.length > 0) {
      result.push(...flattenTree(node.children, depth + 1));
    }
  }
  return result;
}

function filterTree(nodes: ExtendedCategory[], search: string): ExtendedCategory[] {
  if (!search.trim()) return nodes;
  const s = search.toLowerCase().trim();
  const match = (c: ExtendedCategory) =>
    c.name.toLowerCase().includes(s) || c.slug.toLowerCase().includes(s);
  return nodes
    .filter((c) => {
      const filteredChildren = c.children ? filterTree(c.children, search) : [];
      return match(c) || filteredChildren.length > 0;
    })
    .map((c) => ({
      ...c,
      children: c.children ? filterTree(c.children, search) : [],
    }));
}

function VirtualizedCategoryTree({
  categories,
  expandedIds,
  selectedIds,
  onToggleExpand,
  onToggleSelect,
  onEdit,
  onDelete,
  onToggleVisibility,
}: {
  categories: ExtendedCategory[];
  expandedIds: Set<string>;
  selectedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (id: string, multi: boolean) => void;
  onEdit: (c: ExtendedCategory) => void;
  onDelete: (c: ExtendedCategory) => void;
  onToggleVisibility: (c: ExtendedCategory) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const flatList = useMemo(() => {
    const flatten = (nodes: ExtendedCategory[], depth: number): (ExtendedCategory & { depth: number })[] => {
      const result: (ExtendedCategory & { depth: number })[] = [];
      for (const node of nodes) {
        result.push({ ...node, depth });
        if (expandedIds.has(node.id) && node.children && node.children.length > 0) {
          result.push(...flatten(node.children, depth + 1));
        }
      }
      return result;
    };
    return flatten(categories, 0);
  }, [categories, expandedIds]);

  const virtualizer = useVirtualizer({
    count: flatList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
          const cat = flatList[virtualRow.index];
          const hasChildren = cat.children && cat.children.length > 0;
          const isExpanded = expandedIds.has(cat.id);
          const isSelected = selectedIds.has(cat.id);

          return (
            <div
              key={cat.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2 border-b border-border/40 transition-colors hover:bg-muted/30",
                  isSelected && "bg-primary/10"
                )}
                style={{ paddingLeft: `${cat.depth * 24 + 12}px` }}
              >
                <button
                  type="button"
                  className="p-0.5 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => hasChildren && onToggleExpand(cat.id)}
                >
                  {hasChildren ? (
                    isExpanded ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )
                  ) : (
                    <span className="inline-block w-4" />
                  )}
                </button>

                <input
                  type="checkbox"
                  checked={isSelected}
                  onClick={(e) => onToggleSelect(cat.id, e.shiftKey)}
                  onChange={() => {}}
                  className="shrink-0 rounded border-border"
                />

                <GripVertical className="size-4 shrink-0 text-muted-foreground cursor-grab" />

                <span className="min-w-0 flex-1 font-medium truncate">{cat.name}</span>

                <Badge variant="outline" className="shrink-0 font-mono text-xs">
                  L{cat.level}
                </Badge>

                {cat.productCount !== undefined && cat.productCount > 0 && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {cat.productCount} produse
                  </Badge>
                )}

                <Badge
                  variant={cat.isVisibleInMenu ? "success" : "secondary"}
                  className="shrink-0"
                >
                  {cat.isVisibleInMenu ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                </Badge>

                <Badge
                  variant={cat.isActive ? "success" : "secondary"}
                  className="shrink-0"
                >
                  {cat.isActive ? "Active" : "Inactive"}
                </Badge>

                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => onToggleVisibility(cat)}
                    title={cat.isVisibleInMenu ? "Ascunde din meniu" : "Afișează în meniu"}
                  >
                    {cat.isVisibleInMenu ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => onEdit(cat)}
                    title="Editează"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(cat)}
                    title="Șterge"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DuplicatesPanel({
  duplicates,
  onMerge,
  loading,
}: {
  duplicates: DuplicateGroup[];
  onMerge: (sourceId: string, targetId: string) => void;
  loading: boolean;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (duplicates.length === 0) {
    return (
      <div className="py-12 text-center">
        <GitMerge className="mx-auto size-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">Nu s-au găsit duplicate.</p>
        <p className="text-sm text-muted-foreground/70">
          Toate categoriile au nume unice normalizate.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
        <AlertTriangle className="size-5 shrink-0" />
        <p className="text-sm">
          {duplicates.length} grupuri de categorii cu nume similare detectate. Verifică și unește duplicatele.
        </p>
      </div>

      {duplicates.map((group) => {
        const isExpanded = expandedGroups.has(group.normalizedName);
        return (
          <div key={group.normalizedName} className="rounded-xl border border-border/60 bg-card">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-3 text-left"
              onClick={() => {
                setExpandedGroups((prev) => {
                  const next = new Set(prev);
                  if (next.has(group.normalizedName)) next.delete(group.normalizedName);
                  else next.add(group.normalizedName);
                  return next;
                });
              }}
            >
              {isExpanded ? (
                <ChevronDown className="size-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
              <Copy className="size-4 text-amber-500" />
              <span className="font-medium">&quot;{group.normalizedName}&quot;</span>
              <Badge variant="secondary">{group.categories.length} duplicate</Badge>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border/40 px-4 py-3 space-y-2">
                    {group.categories.map((cat, idx) => (
                      <div
                        key={cat.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                      >
                        <Badge variant="outline" className="shrink-0">L{cat.level}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{cat.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {cat.parentName ? `în ${cat.parentName}` : "Categorie rădăcină"} • {cat.productCount} produse
                          </p>
                        </div>
                        {idx > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => onMerge(cat.id, group.categories[0].id)}
                          >
                            <GitMerge className="size-3.5 mr-1" />
                            Unește în primul
                          </Button>
                        )}
                        {idx === 0 && (
                          <Badge variant="success" className="shrink-0">
                            Canonic
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function CategoriesPage() {
  const [flat, setFlat] = useState<ExtendedCategory[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [selected, setSelected] = useState<ExtendedCategory | null>(null);
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("tree");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all: ExtendedCategory[] = [];
      let page = 1;
      const limit = 100;
      let hasNext = true;
      while (hasNext) {
        const res = await categoriesService.getList({ page, limit });
        all.push(...(res.data as ExtendedCategory[]));
        hasNext = res.meta?.hasNext ?? false;
        page += 1;
      }
      setFlat(all);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Failed to load categories";
      setError(msg);
      setFlat([]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDuplicates = useCallback(async () => {
    setDuplicatesLoading(true);
    try {
      const res = await categoriesService.getDuplicates();
      setDuplicates(res);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Failed to load duplicates";
      toast.error(msg);
    } finally {
      setDuplicatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (activeTab === "duplicates") {
      loadDuplicates();
    }
  }, [activeTab, loadDuplicates]);

  const filteredFlat = useMemo(() => {
    let result = flat;
    if (levelFilter !== "all") {
      result = result.filter((c) => c.level === parseInt(levelFilter, 10));
    }
    return result;
  }, [flat, levelFilter]);

  const tree = useMemo(() => buildTree(filteredFlat), [filteredFlat]);
  const filteredTree = useMemo(() => filterTree(tree, search), [tree, search]);
  const parentOptions = useMemo(() => {
    const opts = [{ value: "", label: "— Rădăcină —" }];
    const addOptions = (nodes: ExtendedCategory[], prefix: string) => {
      for (const node of nodes) {
        opts.push({ value: node.id, label: `${prefix}${node.name}` });
        if (node.children) {
          addOptions(node.children, prefix + "  ");
        }
      }
    };
    addOptions(tree, "");
    return opts;
  }, [tree]);

  const defaultFormValues: CategoryFormData = {
    name: "",
    slug: "",
    parentId: null,
    isActive: true,
    isVisibleInMenu: true,
    sortOrder: 0,
    iconName: "",
    imageUrl: "",
    description: "",
  };

  const addForm = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: defaultFormValues,
  });

  const editForm = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: defaultFormValues,
  });

  const handleAddOpen = () => {
    addForm.reset(defaultFormValues);
    setAddOpen(true);
  };

  const handleEdit = (c: ExtendedCategory) => {
    setSelected(c);
    editForm.reset({
      name: c.name,
      slug: c.slug,
      parentId: c.parentId ?? null,
      isActive: c.isActive,
      isVisibleInMenu: c.isVisibleInMenu ?? true,
      sortOrder: c.sortOrder ?? 0,
      iconName: "",
      imageUrl: "",
      description: "",
    });
    setEditOpen(true);
  };

  const handleDeleteClick = (c: ExtendedCategory) => {
    setSelected(c);
    setDeleteOpen(true);
  };

  const handleAddSubmit = async (data: CategoryFormData) => {
    setSubmitting(true);
    try {
      const payload: CreateCategoryPayload = {
        name: data.name,
        slug: data.slug || undefined,
        parentId: data.parentId || undefined,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      };
      await categoriesService.create(payload);
      toast.success("Categorie creată");
      setAddOpen(false);
      loadCategories();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Creare eșuată";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (data: CategoryFormData) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await categoriesService.update(selected.id, {
        name: data.name,
        slug: data.slug || undefined,
        parentId: data.parentId || undefined,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      });
      toast.success("Categorie actualizată");
      setEditOpen(false);
      setSelected(null);
      loadCategories();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Actualizare eșuată";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await categoriesService.delete(selected.id);
      toast.success("Categorie ștearsă");
      setDeleteOpen(false);
      setSelected(null);
      loadCategories();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Ștergere eșuată";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleVisibility = async (c: ExtendedCategory) => {
    try {
      await categoriesService.toggleVisibility(c.id);
      toast.success(c.isVisibleInMenu ? "Ascuns din meniu" : "Afișat în meniu");
      loadCategories();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Actualizare eșuată";
      toast.error(msg);
    }
  };

  const handleMerge = async (sourceId: string, targetId: string) => {
    setSubmitting(true);
    try {
      const result = await categoriesService.merge(sourceId, targetId);
      toast.success(`Unire reușită: ${result.productsReassigned} produse mutate`);
      loadCategories();
      loadDuplicates();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Unire eșuată";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkMove = async (newParentId: string | null) => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      await categoriesService.bulkMove(Array.from(selectedIds), newParentId);
      toast.success(`${selectedIds.size} categorii mutate`);
      setSelectedIds(new Set());
      setBulkMoveOpen(false);
      loadCategories();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Mutare eșuată";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string, multi: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (!multi) next.clear();
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const ids = new Set<string>();
    const collect = (nodes: ExtendedCategory[]) => {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          ids.add(node.id);
          collect(node.children);
        }
      }
    };
    collect(tree);
    setExpandedIds(ids);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const selectAll = () => {
    setSelectedIds(new Set(flat.map((c) => c.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorii</h1>
          <p className="text-muted-foreground mt-1">
            Gestionează ierarhia categoriilor (max 3 nivele)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl" onClick={loadCategories}>
            <RefreshCw className="size-4 mr-2" />
            Reîncarcă
          </Button>
          <Button className="rounded-xl" onClick={handleAddOpen}>
            <Plus className="size-4 mr-2" />
            Adaugă categorie
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-xl">
          <TabsTrigger value="tree" className="rounded-xl">
            Arbore categorii
          </TabsTrigger>
          <TabsTrigger value="duplicates" className="rounded-xl">
            Duplicate
            {duplicates.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {duplicates.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree" className="mt-4">
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Arbore categorii</CardTitle>
                  <CardDescription>
                    {flat.length} categorii total • {selectedIds.size} selectate
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Caută categorii..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="rounded-xl pl-9"
                    />
                  </div>
                  <Select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    className="w-32 rounded-xl"
                  >
                    <option value="all">Toate nivelele</option>
                    <option value="1">Nivel 1</option>
                    <option value="2">Nivel 2</option>
                    <option value="3">Nivel 3</option>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={expandAll}>
                  Extinde tot
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={collapseAll}>
                  Restrânge tot
                </Button>
                <div className="w-px h-6 bg-border" />
                <Button variant="outline" size="sm" className="rounded-xl" onClick={selectAll}>
                  Selectează tot
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={deselectAll}>
                  Deselectează
                </Button>
                {selectedIds.size > 0 && (
                  <>
                    <div className="w-px h-6 bg-border" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setBulkMoveOpen(true)}
                    >
                      <ExternalLink className="size-3.5 mr-1" />
                      Mută {selectedIds.size} selectate
                    </Button>
                  </>
                )}
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 py-8 text-center text-destructive">
                  {error}
                </div>
              ) : filteredTree.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  {flat.length === 0
                    ? "Nu există categorii. Adaugă una pentru a începe."
                    : "Nicio categorie nu corespunde căutării."}
                </div>
              ) : (
                <VirtualizedCategoryTree
                  categories={filteredTree}
                  expandedIds={expandedIds}
                  selectedIds={selectedIds}
                  onToggleExpand={toggleExpand}
                  onToggleSelect={toggleSelect}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  onToggleVisibility={handleToggleVisibility}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duplicates" className="mt-4">
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle>Detectare duplicate</CardTitle>
              <CardDescription>
                Categorii cu nume similare (normalizate) care pot fi unificate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DuplicatesPanel
                duplicates={duplicates}
                onMerge={handleMerge}
                loading={duplicatesLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adaugă categorie</DialogTitle>
            <DialogDescription>
              Slug-ul va fi generat automat din nume dacă este lăsat gol.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="add-name">Nume</Label>
                <Input id="add-name" className="rounded-xl mt-1" {...addForm.register("name")} />
                {addForm.formState.errors.name && (
                  <p className="text-destructive text-sm mt-1">{addForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="add-slug">Slug (opțional)</Label>
                <Input
                  id="add-slug"
                  className="rounded-xl mt-1"
                  placeholder="auto-generat"
                  {...addForm.register("slug")}
                />
              </div>
              <div>
                <Label htmlFor="add-sort">Ordine sortare</Label>
                <Input
                  id="add-sort"
                  type="number"
                  className="rounded-xl mt-1"
                  {...addForm.register("sortOrder", { valueAsNumber: true })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="add-parent">Părinte</Label>
                <Select
                  id="add-parent"
                  className="mt-1 rounded-xl"
                  value={addForm.watch("parentId") ?? ""}
                  onChange={(e) => addForm.setValue("parentId", e.target.value || null)}
                >
                  {parentOptions.map((o) => (
                    <option key={o.value || "root"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-border"
                  {...addForm.register("isActive")}
                />
                <span className="text-sm">Activ</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-border"
                  {...addForm.register("isVisibleInMenu")}
                />
                <span className="text-sm">Vizibil în meniu</span>
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setAddOpen(false)}>
                Anulează
              </Button>
              <Button type="submit" className="rounded-xl" disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : "Creează"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editează categorie</DialogTitle>
            <DialogDescription>
              Actualizează numele, slug-ul, părintele sau vizibilitatea.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="edit-name">Nume</Label>
                <Input id="edit-name" className="rounded-xl mt-1" {...editForm.register("name")} />
                {editForm.formState.errors.name && (
                  <p className="text-destructive text-sm mt-1">{editForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-slug">Slug</Label>
                <Input id="edit-slug" className="rounded-xl mt-1" {...editForm.register("slug")} />
              </div>
              <div>
                <Label htmlFor="edit-sort">Ordine sortare</Label>
                <Input
                  id="edit-sort"
                  type="number"
                  className="rounded-xl mt-1"
                  {...editForm.register("sortOrder", { valueAsNumber: true })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="edit-parent">Părinte</Label>
                <Select
                  id="edit-parent"
                  className="mt-1 rounded-xl"
                  value={editForm.watch("parentId") ?? ""}
                  onChange={(e) => editForm.setValue("parentId", e.target.value || null)}
                >
                  {parentOptions
                    .filter((o) => o.value !== selected?.id)
                    .map((o) => (
                      <option key={o.value || "root"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-border"
                  {...editForm.register("isActive")}
                />
                <span className="text-sm">Activ</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-border"
                  {...editForm.register("isVisibleInMenu")}
                />
                <span className="text-sm">Vizibil în meniu</span>
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)}>
                Anulează
              </Button>
              <Button type="submit" className="rounded-xl" disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : "Salvează"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Șterge categorie</DialogTitle>
            <DialogDescription>
              {`Ștergi "${selected?.name ?? ""}"? Acțiunea nu poate fi anulată. Categoriile cu copii sau produse nu pot fi șterse.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteOpen(false)}>
              Anulează
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleDeleteConfirm} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : "Șterge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkMoveOpen} onOpenChange={setBulkMoveOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mută {selectedIds.size} categorii</DialogTitle>
            <DialogDescription>Selectează noul părinte pentru categoriile selectate.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="bulk-parent">Noul părinte</Label>
            <Select
              id="bulk-parent"
              className="mt-2 rounded-xl"
              defaultValue=""
              onChange={(e) => handleBulkMove(e.target.value || null)}
            >
              {parentOptions
                .filter((o) => !selectedIds.has(o.value))
                .map((o) => (
                  <option key={o.value || "root"} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setBulkMoveOpen(false)}>
              Anulează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
