"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2, GripVertical, LayoutGrid, List } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { MediaPicker } from "@/components/media/media-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlockPreview } from "@/components/cms/block-preview";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cmsService, type ContentBlockItem } from "@/services/cms.service";
import type { PaginatedResponse } from "@/types/api";
import { toast } from "sonner";

const placementOptions = ["home", "global_top", "products"];
const heroVariants = ["default", "split", "full_bleed"] as const;
const promoColumns = [2, 3, 4] as const;

const promoItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  href: z.string().optional(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
});

const formSchema = z.object({
  type: z.enum(["HERO", "PROMO_GRID", "BANNER"]),
  placement: z.string().min(1, "Placement is required"),
  sortOrder: z.number().min(0),
  isActive: z.boolean().optional(),
  // HERO
  heroTitle: z.string().optional(),
  heroSubtitle: z.string().optional(),
  heroCtaLabel: z.string().optional(),
  heroCtaHref: z.string().optional(),
  heroImageUrl: z.string().optional(),
  heroImageAlt: z.string().optional(),
  heroVariant: z.enum(heroVariants).optional(),
  // BANNER
  bannerTitle: z.string().optional(),
  bannerBody: z.string().optional(),
  bannerCtaLabel: z.string().optional(),
  bannerCtaHref: z.string().optional(),
  bannerBackgroundColor: z.string().optional(),
  bannerTextColor: z.string().optional(),
  bannerBackgroundImageUrl: z.string().optional(),
  bannerBackgroundImageAlt: z.string().optional(),
  // PROMO_GRID
  promoItems: z.array(promoItemSchema).optional(),
  promoColumns: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal("2"), z.literal("3"), z.literal("4")]).optional(),
});

type FormData = z.infer<typeof formSchema>;

function buildPayloadFromForm(form: FormData): Record<string, unknown> {
  switch (form.type) {
    case "HERO":
      return {
        title: form.heroTitle ?? "",
        subtitle: form.heroSubtitle || undefined,
        ctaLabel: form.heroCtaLabel || undefined,
        ctaHref: form.heroCtaHref || undefined,
        imageUrl: form.heroImageUrl ?? "",
        imageAlt: form.heroImageAlt || undefined,
        variant: form.heroVariant ?? "default",
      };
    case "BANNER":
      return {
        title: form.bannerTitle ?? "",
        body: form.bannerBody || undefined,
        ctaLabel: form.bannerCtaLabel || undefined,
        ctaHref: form.bannerCtaHref || undefined,
        backgroundColor: form.bannerBackgroundColor || undefined,
        textColor: form.bannerTextColor || undefined,
        backgroundImageUrl: form.bannerBackgroundImageUrl || undefined,
        backgroundImageAlt: form.bannerBackgroundImageAlt || undefined,
      };
    case "PROMO_GRID":
      return {
        items: (form.promoItems ?? []).map((item, i) => ({
          id: item.id?.trim() || `promo-${i + 1}`,
          title: item.title ?? "",
          subtitle: item.subtitle || undefined,
          href: item.href ?? "",
          imageUrl: item.imageUrl ?? "",
          imageAlt: item.imageAlt || undefined,
        })),
        columns: Number(form.promoColumns) || 3,
      };
    default:
      return {};
  }
}

function getDefaultPayloadFields(type: FormData["type"]): Partial<FormData> {
  switch (type) {
    case "HERO":
      return {
        heroTitle: "",
        heroSubtitle: "",
        heroCtaLabel: "",
        heroCtaHref: "",
        heroImageUrl: "",
        heroImageAlt: "",
        heroVariant: "default",
      };
    case "BANNER":
      return {
        bannerTitle: "",
        bannerBody: "",
        bannerCtaLabel: "",
        bannerCtaHref: "",
        bannerBackgroundColor: "",
        bannerTextColor: "",
        bannerBackgroundImageUrl: "",
        bannerBackgroundImageAlt: "",
      };
    case "PROMO_GRID":
      return { promoItems: [{ id: "promo-1", title: "", href: "", imageUrl: "" }], promoColumns: 3 };
    default:
      return {};
  }
}

function getBlockTitle(block: ContentBlockItem): string {
  const p = (block.payload || {}) as Record<string, unknown>;
  if (block.type === "HERO" || block.type === "BANNER") return (p.title as string) || block.type;
  if (block.type === "PROMO_GRID") return `Promo grid (${(p.items as unknown[])?.length ?? 0} items)`;
  return block.type;
}

function SortableBlockCard({
  block,
  onEdit,
  onDelete,
}: {
  block: ContentBlockItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 ${isDragging ? "opacity-50 shadow-lg" : ""}`}
    >
      <button
        type="button"
        className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 rounded"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex-1 min-w-0">
        <Badge variant="secondary" className="text-xs">{block.type}</Badge>
        <p className="font-medium truncate mt-1">{getBlockTitle(block)}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="sm" className="rounded-lg h-8 w-8 p-0" onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" className="rounded-lg h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

interface CmsPageProps {
  placementLock?: string;
  pageTitle?: string;
}

export default function CmsPage({ placementLock, pageTitle }: CmsPageProps = {}) {
  const [data, setData] = useState<PaginatedResponse<ContentBlockItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [placementFilter, setPlacementFilter] = useState<string>(placementLock ?? "");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "layout">(placementLock ? "layout" : "table");
  const [layoutPlacement, setLayoutPlacement] = useState<string>(placementLock ?? "home");
  const [layoutBlocks, setLayoutBlocks] = useState<ContentBlockItem[]>([]);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const limit = 20;
  const isLocked = Boolean(placementLock);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "BANNER",
      placement: "home",
      sortOrder: 0,
      isActive: true,
      heroTitle: "",
      heroSubtitle: "",
      heroCtaLabel: "",
      heroCtaHref: "",
      heroImageUrl: "",
      heroImageAlt: "",
      heroVariant: "default",
      bannerTitle: "",
      bannerBody: "",
      bannerCtaLabel: "",
      bannerCtaHref: "",
      bannerBackgroundColor: "",
      bannerTextColor: "",
      bannerBackgroundImageUrl: "",
      bannerBackgroundImageAlt: "",
      promoItems: [{ id: "promo-1", title: "", href: "", imageUrl: "" }],
      promoColumns: 3,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "promoItems" });

  const typeVal = watch("type");

  const load = () => {
    setLoading(true);
    cmsService
      .getList({
        page: page + 1,
        limit,
        ...(placementFilter && { placement: placementFilter }),
        ...(typeFilter && { type: typeFilter as "HERO" | "PROMO_GRID" | "BANNER" }),
      })
      .then(setData)
      .catch(() =>
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
        })
      )
      .finally(() => setLoading(false));
  };

  const loadLayoutBlocks = () => {
    setLayoutLoading(true);
    cmsService
      .getList({ placement: layoutPlacement, limit: 100, page: 1 })
      .then((res) => setLayoutBlocks(res.data ?? []))
      .catch(() => setLayoutBlocks([]))
      .finally(() => setLayoutLoading(false));
  };

  useEffect(() => {
    load();
  }, [page, placementFilter, typeFilter]);

  useEffect(() => {
    if (viewMode === "layout") loadLayoutBlocks();
  }, [viewMode, layoutPlacement]);

  const handleLayoutDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = layoutBlocks.map((b) => b.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...ids];
    const [removed] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, removed);
    try {
      await cmsService.reorder(reordered);
      toast.success("Order updated");
      loadLayoutBlocks();
      load();
    } catch {
      toast.error("Failed to reorder");
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const openCreate = () => {
    setEditingId(null);
    reset({
      type: "BANNER",
      placement: placementLock ?? "home",
      sortOrder: 0,
      isActive: true,
      ...getDefaultPayloadFields("BANNER"),
    });
    setDialogOpen(true);
  };

  const openEdit = (block: ContentBlockItem) => {
    setEditingId(block.id);
    const p = (block.payload || {}) as Record<string, unknown>;
    const base = {
      type: block.type,
      placement: block.placement,
      sortOrder: block.sortOrder,
      isActive: block.isActive,
    };
    if (block.type === "HERO") {
      reset({
        ...base,
        heroTitle: (p.title as string) ?? "",
        heroSubtitle: (p.subtitle as string) ?? "",
        heroCtaLabel: (p.ctaLabel as string) ?? "",
        heroCtaHref: (p.ctaHref as string) ?? "",
        heroImageUrl: (p.imageUrl as string) ?? "",
        heroImageAlt: (p.imageAlt as string) ?? "",
        heroVariant: ((p.variant as string) ?? "default") as "default" | "split" | "full_bleed",
      });
    } else if (block.type === "BANNER") {
      reset({
        ...base,
        bannerTitle: (p.title as string) ?? "",
        bannerBody: (p.body as string) ?? "",
        bannerCtaLabel: (p.ctaLabel as string) ?? "",
        bannerCtaHref: (p.ctaHref as string) ?? "",
        bannerBackgroundColor: (p.backgroundColor as string) ?? "",
        bannerTextColor: (p.textColor as string) ?? "",
        bannerBackgroundImageUrl: (p.backgroundImageUrl as string) ?? "",
        bannerBackgroundImageAlt: (p.backgroundImageAlt as string) ?? "",
      });
    } else {
      const items = (p.items as Array<{ id?: string; title?: string; subtitle?: string; href?: string; imageUrl?: string; imageAlt?: string }>) ?? [];
      reset({
        ...base,
        promoItems: items.length > 0 ? items.map((it, i) => ({ id: (it.id as string) ?? `promo-${i + 1}`, title: (it.title as string) ?? "", subtitle: (it.subtitle as string) ?? "", href: (it.href as string) ?? "", imageUrl: (it.imageUrl as string) ?? "", imageAlt: (it.imageAlt as string) ?? "" })) : [{ id: "promo-1", title: "", href: "", imageUrl: "" }],
        promoColumns: (p.columns as 2 | 3 | 4) ?? 3,
      });
    }
    setDialogOpen(true);
  };

  const onSubmit = async (form: FormData) => {
    if (form.type === "HERO" && (!form.heroTitle?.trim() || !form.heroImageUrl?.trim())) {
      toast.error("Hero block requires Title and Image URL");
      return;
    }
    if (form.type === "BANNER" && !form.bannerTitle?.trim()) {
      toast.error("Banner block requires Title");
      return;
    }
    if (form.type === "PROMO_GRID") {
      const items = form.promoItems ?? [];
      if (items.length === 0) {
        toast.error("Promo grid needs at least one item");
        return;
      }
      const invalid = items.some((it) => !it.title?.trim() || !it.href?.trim() || !it.imageUrl?.trim());
      if (invalid) {
        toast.error("Each promo item needs Title, Link, and Image URL");
        return;
      }
    }
    const payload = buildPayloadFromForm(form);
    const placement = isLocked ? placementLock! : form.placement;
    try {
      if (editingId) {
        await cmsService.update(editingId, {
          placement,
          sortOrder: form.sortOrder ?? 0,
          isActive: form.isActive ?? true,
          payload,
        });
        toast.success("Block updated");
      } else {
        await cmsService.create({
          type: form.type,
          placement,
          sortOrder: form.sortOrder ?? 0,
          isActive: form.isActive ?? true,
          payload,
        });
        toast.success("Block created");
      }
      setDialogOpen(false);
      load();
      if (viewMode === "layout") loadLayoutBlocks();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Failed";
      toast.error(msg);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await cmsService.delete(deleteId);
      toast.success("Block deleted");
      setDeleteId(null);
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const blocks = data?.data ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{pageTitle ?? "CMS – Content blocks"}</h1>
        <p className="text-muted-foreground mt-1">
          {isLocked
            ? `Add, reorder, and edit blocks for this page.`
            : "Manage hero, banner, and promo grid blocks for homepage and other placements"}
        </p>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Content blocks</CardTitle>
            <CardDescription>List, add, edit, reorder, and delete blocks</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!isLocked && (
              <div className="flex rounded-xl border border-border/60 p-1 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "table" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <List className="size-4" />
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("layout")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "layout" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <LayoutGrid className="size-4" />
                  Layout
                </button>
              </div>
            )}
            {!isLocked && viewMode === "table" && (
              <>
                <Select
                  value={placementFilter || "all"}
                  onChange={(e) => setPlacementFilter(e.target.value === "all" ? "" : e.target.value)}
                  className="w-[140px]"
                >
                  <option value="all">All placements</option>
                  {placementOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
                <Select
                  value={typeFilter || "all"}
                  onChange={(e) => setTypeFilter(e.target.value === "all" ? "" : e.target.value)}
                  className="w-[140px]"
                >
                  <option value="all">All types</option>
                  <option value="HERO">Hero</option>
                  <option value="PROMO_GRID">Promo grid</option>
                  <option value="BANNER">Banner</option>
                </Select>
              </>
            )}
            {!isLocked && viewMode === "layout" && (
              <Select
                value={layoutPlacement}
                onChange={(e) => setLayoutPlacement(e.target.value)}
                className="w-[140px]"
              >
                {placementOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            )}
            <Button className="rounded-xl" onClick={openCreate}>
              <Plus className="size-4 mr-2" />
              Add block
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "table" && (
            <>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : blocks.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">No content blocks yet. Add one to get started.</p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-2xl border border-border/60">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="px-4 py-3 font-medium text-muted-foreground">Placement</th>
                          <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                          <th className="px-4 py-3 font-medium text-muted-foreground">Sort</th>
                          <th className="px-4 py-3 font-medium text-muted-foreground">Active</th>
                          <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blocks.map((block) => (
                          <tr
                            key={block.id}
                            className="border-b border-border/60 transition-colors hover:bg-muted/30"
                          >
                            <td className="px-4 py-3 font-mono text-muted-foreground">{block.placement}</td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary">{block.type}</Badge>
                            </td>
                            <td className="px-4 py-3">{block.sortOrder}</td>
                            <td className="px-4 py-3">
                              <Badge variant={block.isActive ? "default" : "secondary"}>
                                {block.isActive ? "Yes" : "No"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 flex gap-2">
                              <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => openEdit(block)}>
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(block.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
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
            </>
          )}
          {viewMode === "layout" && (
            <>
              {layoutLoading ? (
                <div className="space-y-3 py-8">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              ) : layoutBlocks.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">
                  No blocks for placement &quot;{layoutPlacement}&quot;. Add a block and set its placement to {layoutPlacement} to arrange it here.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-2">Drag to reorder blocks. Order is saved automatically.</p>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLayoutDragEnd}>
                    <SortableContext items={layoutBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                      {layoutBlocks.map((block) => (
                        <SortableBlockCard
                          key={block.id}
                          block={block}
                          onEdit={() => openEdit(block)}
                          onDelete={() => setDeleteId(block.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit block" : "Add block"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update placement, sort order, and content." : "Choose type, placement, and fill in the content fields."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl">
                <TabsTrigger value="content" className="rounded-lg">Content</TabsTrigger>
                <TabsTrigger value="preview" className="rounded-lg">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="content" className="space-y-4 mt-4">
            {!editingId && (
              <div>
                <Label>Type</Label>
                <Select
                  value={typeVal}
                  onChange={(e) => {
                    const t = e.target.value as "HERO" | "PROMO_GRID" | "BANNER";
                    setValue("type", t);
                    Object.entries(getDefaultPayloadFields(t)).forEach(([k, v]) => setValue(k as keyof FormData, v));
                  }}
                  className="rounded-xl mt-1 w-full"
                >
                  <option value="HERO">Hero</option>
                  <option value="PROMO_GRID">Promo grid</option>
                  <option value="BANNER">Banner</option>
                </Select>
              </div>
            )}
            {!isLocked && (
              <div>
                <Label>Placement</Label>
                <Select
                  value={watch("placement")}
                  onChange={(e) => setValue("placement", e.target.value)}
                  className="rounded-xl mt-1 w-full"
                >
                  {placementOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {isLocked && (
              <p className="text-sm text-muted-foreground">Placement: <span className="font-mono">{placementLock}</span></p>
            )}
            <div>
              <Label htmlFor="sortOrder">Sort order</Label>
              <Input
                id="sortOrder"
                type="number"
                className="rounded-xl mt-1"
                {...register("sortOrder", { valueAsNumber: true })}
              />
            </div>
            {editingId && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={watch("isActive")}
                  onChange={(e) => setValue("isActive", e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            )}

            {typeVal === "HERO" && (
              <div className="space-y-3 rounded-xl border border-border/60 p-4 bg-muted/20">
                <p className="text-sm font-medium text-muted-foreground">Hero content</p>
                <div className="grid gap-3">
                  <div>
                    <Label htmlFor="heroTitle">Title *</Label>
                    <Input id="heroTitle" className="rounded-xl mt-1" {...register("heroTitle")} placeholder="Welcome" />
                  </div>
                  <div>
                    <Label htmlFor="heroSubtitle">Subtitle</Label>
                    <Input id="heroSubtitle" className="rounded-xl mt-1" {...register("heroSubtitle")} placeholder="Optional subtitle" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="heroCtaLabel">Button label</Label>
                      <Input id="heroCtaLabel" className="rounded-xl mt-1" {...register("heroCtaLabel")} placeholder="Shop now" />
                    </div>
                    <div>
                      <Label htmlFor="heroCtaHref">Button link</Label>
                      <Input id="heroCtaHref" className="rounded-xl mt-1" {...register("heroCtaHref")} placeholder="/products" />
                    </div>
                  </div>
                  <div>
                    <Label>Image URL *</Label>
                    <MediaPicker
                      value={watch("heroImageUrl") ?? ""}
                      onChange={(url, alt) => {
                        setValue("heroImageUrl", url);
                        if (alt != null) setValue("heroImageAlt", alt);
                      }}
                      placeholder="/img/hero.jpg or choose from library"
                      className="mt-1"
                    />
                    <Input
                      id="heroImageAlt"
                      className="rounded-xl mt-2"
                      {...register("heroImageAlt")}
                      placeholder="Image alt text (optional)"
                    />
                  </div>
                  <div>
                    <Label>Variant</Label>
                    <Select className="rounded-xl mt-1 w-full" {...register("heroVariant")}>
                      {heroVariants.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {typeVal === "BANNER" && (
              <div className="space-y-3 rounded-xl border border-border/60 p-4 bg-muted/20">
                <p className="text-sm font-medium text-muted-foreground">Banner content</p>
                <div className="grid gap-3">
                  <div>
                    <Label htmlFor="bannerTitle">Title *</Label>
                    <Input id="bannerTitle" className="rounded-xl mt-1" {...register("bannerTitle")} placeholder="Special offer" />
                  </div>
                  <div>
                    <Label htmlFor="bannerBody">Body text</Label>
                    <textarea
                      id="bannerBody"
                      className="mt-1 min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                      {...register("bannerBody")}
                      placeholder="Optional description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="bannerCtaLabel">Button label</Label>
                      <Input id="bannerCtaLabel" className="rounded-xl mt-1" {...register("bannerCtaLabel")} />
                    </div>
                    <div>
                      <Label htmlFor="bannerCtaHref">Button link</Label>
                      <Input id="bannerCtaHref" className="rounded-xl mt-1" {...register("bannerCtaHref")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <ColorPicker
                      id="bannerBackgroundColor"
                      label="Background color"
                      value={watch("bannerBackgroundColor") ?? ""}
                      onChange={(hex) => setValue("bannerBackgroundColor", hex)}
                      placeholder="#1a1a1a"
                    />
                    <ColorPicker
                      id="bannerTextColor"
                      label="Text color"
                      value={watch("bannerTextColor") ?? ""}
                      onChange={(hex) => setValue("bannerTextColor", hex)}
                      placeholder="#ffffff"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Background image</Label>
                    <MediaPicker
                      value={watch("bannerBackgroundImageUrl") ?? ""}
                      onChange={(url, alt) => {
                        setValue("bannerBackgroundImageUrl", url);
                        if (alt != null) setValue("bannerBackgroundImageAlt", alt);
                      }}
                      placeholder="Optional background image"
                      className="mt-1"
                    />
                    <Input
                      className="rounded-xl mt-2"
                      {...register("bannerBackgroundImageAlt")}
                      placeholder="Background image alt text (optional)"
                    />
                  </div>
                </div>
              </div>
            )}

            {typeVal === "PROMO_GRID" && (
              <div className="space-y-3 rounded-xl border border-border/60 p-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Promo items</p>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Columns</Label>
                    <Select className="w-20 rounded-xl" {...register("promoColumns")}>
                      {promoColumns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="rounded-lg border border-border/40 p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                        <Button type="button" variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0" onClick={() => remove(index)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        <Input placeholder="ID (e.g. promo-1)" className="rounded-xl" {...register(`promoItems.${index}.id`)} />
                        <Input placeholder="Title *" className="rounded-xl" {...register(`promoItems.${index}.title`)} />
                        <Input placeholder="Subtitle" className="rounded-xl" {...register(`promoItems.${index}.subtitle`)} />
                        <Input placeholder="Link (href) *" className="rounded-xl" {...register(`promoItems.${index}.href`)} />
                        <div>
                          <Label className="text-xs text-muted-foreground">Image</Label>
                          <MediaPicker
                            value={watch(`promoItems.${index}.imageUrl`) ?? ""}
                            onChange={(url, alt) => {
                              setValue(`promoItems.${index}.imageUrl`, url);
                              if (alt != null) setValue(`promoItems.${index}.imageAlt`, alt);
                            }}
                            placeholder="Image URL or choose from library"
                            className="mt-1"
                          />
                          <Input placeholder="Image alt" className="rounded-xl mt-2" {...register(`promoItems.${index}.imageAlt`)} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="rounded-xl w-full" onClick={() => append({ id: `promo-${fields.length + 1}`, title: "", href: "", imageUrl: "" })}>
                    <Plus className="size-4 mr-2" />
                    Add item
                  </Button>
                </div>
              </div>
            )}

              </TabsContent>
              <TabsContent value="preview" className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Live preview</p>
                <BlockPreview type={typeVal} form={watch()} />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
                {editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete block</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="rounded-xl">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
