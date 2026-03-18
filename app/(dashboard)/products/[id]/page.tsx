"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { productsService, type ProductDetail, type UpdateProductPayload } from "@/services/products.service";
import { categoriesService, type CategoryItem } from "@/services/categories.service";
import { useForm } from "react-hook-form";

type FormValues = UpdateProductPayload;

export default function ProductEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm<FormValues>();

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [p, cats] = await Promise.all([
          productsService.getById(id),
          categoriesService.getList({ limit: 100 }),
        ]);
        if (cancelled) return;
        setProduct(p);
        setCategories(cats.data);
        reset({
          sku: p.sku,
          name: p.name,
          slug: p.slug,
          description: p.description,
          categoryId: p.categoryId ?? undefined,
          status: p.status as FormValues["status"],
          metaTitle: p.metaTitle ?? undefined,
          metaDescription: p.metaDescription ?? undefined,
          metaKeywords: p.metaKeywords ?? undefined,
        });
      } catch {
        if (!cancelled) setError("Failed to load product.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      await productsService.update(id, values);
      router.push("/products");
    } catch {
      setError("Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return <p className="text-sm text-red-500">Missing product ID in URL.</p>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit product</h1>
        <p className="text-muted-foreground mt-1">
          Product ID: <span className="font-mono text-xs">{id}</span>
        </p>
        {product?.odooSync && (
          <p className="text-xs text-muted-foreground mt-1">
            Odoo ID: {product.odooSync.odooProductId ?? "not linked"} · Last sync:{" "}
            {product.odooSync.lastSyncedAt
              ? new Date(product.odooSync.lastSyncedAt).toLocaleString()
              : "never"}
          </p>
        )}
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle>Product details</CardTitle>
          <CardDescription>
            Update catalog fields. Saving will also sync allowed fields to Odoo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <Input className="rounded-xl" {...register("name", { required: true })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SKU</label>
                  <Input className="rounded-xl" {...register("sku", { required: true })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slug</label>
                  <Input className="rounded-xl" {...register("slug")} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <Select className="rounded-2xl" {...register("status")}>
                    <option value="DRAFT">DRAFT</option>
                    <option value="ACTIVE">ACTIVE</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <Select className="rounded-2xl" {...register("categoryId")}>
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  rows={4}
                  className="rounded-xl resize-y"
                  {...register("description")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Meta title</label>
                  <Input className="rounded-xl" {...register("metaTitle")} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Meta description</label>
                  <Input className="rounded-xl" {...register("metaDescription")} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Meta keywords</label>
                  <Input className="rounded-xl" {...register("metaKeywords")} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => router.push("/products")}
                >
                  Cancel
                </Button>
                <Button type="submit" className="rounded-xl" disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

