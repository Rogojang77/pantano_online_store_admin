"use client";

import { useState, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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
import {
  promotionsService,
  type PromotionItem,
  type CreatePromotionPayload,
} from "@/services/promotions.service";
import type { PaginatedResponse } from "@/types/api";
import { toast } from "sonner";

const formSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  value: z.number().min(0, "Value must be ≥ 0"),
  minPurchaseAmount: z.number().min(0).optional().nullable(),
  validFrom: z.string().min(1, "Valid from is required"),
  validTo: z.string().min(1, "Valid to is required"),
  usageLimit: z.number().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function PromotionsPage() {
  const [data, setData] = useState<PaginatedResponse<PromotionItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const limit = 20;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema) as Resolver<FormData>,
    defaultValues: {
      code: "",
      name: "",
      description: "",
      type: "PERCENTAGE",
      value: 0,
      minPurchaseAmount: null,
      validFrom: "",
      validTo: "",
      usageLimit: null,
      isActive: true,
    },
  });

  const load = () => {
    setLoading(true);
    promotionsService
      .getList({ page: page + 1, limit })
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

  useEffect(() => {
    load();
  }, [page]);

  const openCreate = () => {
    setEditingId(null);
    const now = new Date();
    const from = now.toISOString().slice(0, 16);
    const to = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    reset({
      code: "",
      name: "",
      description: "",
      type: "PERCENTAGE",
      value: 10,
      minPurchaseAmount: null,
      validFrom: from,
      validTo: to,
      usageLimit: null,
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (promo: PromotionItem) => {
    setEditingId(promo.id);
    reset({
      code: promo.code,
      name: promo.name,
      description: promo.description ?? "",
      type: promo.type,
      value: Number(promo.value),
      minPurchaseAmount: promo.minPurchaseAmount != null ? Number(promo.minPurchaseAmount) : null,
      validFrom: new Date(promo.validFrom).toISOString().slice(0, 16),
      validTo: new Date(promo.validTo).toISOString().slice(0, 16),
      usageLimit: promo.usageLimit ?? null,
      isActive: promo.isActive,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (form: FormData) => {
    try {
      const payload: CreatePromotionPayload = {
        code: form.code.trim().toUpperCase(),
        name: form.name,
        type: form.type,
        value: form.value,
        validFrom: new Date(form.validFrom).toISOString(),
        validTo: new Date(form.validTo).toISOString(),
        isActive: form.isActive ?? true,
      };
      if (form.description) payload.description = form.description;
      if (form.minPurchaseAmount != null && form.minPurchaseAmount > 0)
        payload.minPurchaseAmount = form.minPurchaseAmount;
      if (form.usageLimit != null && form.usageLimit > 0) payload.usageLimit = form.usageLimit;

      if (editingId) {
        await promotionsService.update(editingId, payload);
        toast.success("Promotion updated");
      } else {
        await promotionsService.create(payload);
        toast.success("Promotion created");
      }
      setDialogOpen(false);
      load();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e && typeof (e as { response: unknown }).response === "object"
          ? String(((e as { response: { data?: { message?: string } } }).response?.data?.message ?? "Failed"))
          : "Failed";
      toast.error(msg);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await promotionsService.delete(deleteId);
      toast.success("Promotion deleted");
      setDeleteId(null);
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const promotions = data?.data ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Promotions</h1>
        <p className="text-muted-foreground mt-1">
          Manage discount codes and coupons (percentage or fixed amount)
        </p>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Discount codes</CardTitle>
            <CardDescription>Create and edit promotions applied at checkout</CardDescription>
          </div>
          <Button className="rounded-xl" onClick={openCreate}>
            <Plus className="size-4 mr-2" />
            Add promotion
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : promotions.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              No promotions yet. Add one to offer discounts at checkout.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-border/60">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 font-medium text-muted-foreground">Code</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Value</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Valid</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Usage</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Active</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotions.map((promo) => (
                      <tr
                        key={promo.id}
                        className="border-b border-border/60 transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 font-mono font-medium">{promo.code}</td>
                        <td className="px-4 py-3">{promo.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{promo.type}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {promo.type === "PERCENTAGE" ? `${Number(promo.value)}%` : Number(promo.value)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(promo.validFrom).toLocaleDateString()} – {new Date(promo.validTo).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {promo.usageCount}
                          {promo.usageLimit != null ? ` / ${promo.usageLimit}` : ""}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={promo.isActive ? "default" : "secondary"}>
                            {promo.isActive ? "Yes" : "No"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 flex gap-2">
                          <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => openEdit(promo)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(promo.id)}
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
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit promotion" : "Add promotion"}</DialogTitle>
            <DialogDescription>
              Coupon code is case-insensitive. Use percentage or fixed amount discount.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                className="rounded-xl mt-1"
                placeholder="SAVE10"
                {...register("code")}
              />
              {errors.code && <p className="text-sm text-destructive mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" className="rounded-xl mt-1" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" className="rounded-xl mt-1" {...register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={watch("type")}
                  onChange={(e) => setValue("type", e.target.value as "PERCENTAGE" | "FIXED_AMOUNT")}
                  className="rounded-xl mt-1"
                >
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED_AMOUNT">Fixed amount</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  className="rounded-xl mt-1"
                  {...register("value", { valueAsNumber: true })}
                />
                {errors.value && <p className="text-sm text-destructive mt-1">{errors.value.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="minPurchaseAmount">Min. purchase (optional)</Label>
              <Input
                id="minPurchaseAmount"
                type="number"
                step="0.01"
                className="rounded-xl mt-1"
                {...register("minPurchaseAmount", {
                  setValueAs: (v) => (v === "" || Number.isNaN(Number(v)) ? undefined : Number(v)),
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="validFrom">Valid from</Label>
                <Input
                  id="validFrom"
                  type="datetime-local"
                  className="rounded-xl mt-1"
                  {...register("validFrom")}
                />
                {errors.validFrom && (
                  <p className="text-sm text-destructive mt-1">{errors.validFrom.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="validTo">Valid to</Label>
                <Input
                  id="validTo"
                  type="datetime-local"
                  className="rounded-xl mt-1"
                  {...register("validTo")}
                />
                {errors.validTo && (
                  <p className="text-sm text-destructive mt-1">{errors.validTo.message}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="usageLimit">Usage limit (optional, empty = unlimited)</Label>
              <Input
                id="usageLimit"
                type="number"
                min={0}
                className="rounded-xl mt-1"
                {...register("usageLimit", {
                  setValueAs: (v) => (v === "" || Number.isNaN(Number(v)) ? undefined : Number(v)),
                })}
              />
            </div>
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
            <DialogTitle>Delete promotion</DialogTitle>
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
