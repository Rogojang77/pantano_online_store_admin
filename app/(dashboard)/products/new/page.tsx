"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { productsService, type CreateProductPayload } from "@/services/products.service";
import { categoriesService, type CategoryItem } from "@/services/categories.service";
import { useForm } from "react-hook-form";

type FormValues = CreateProductPayload;

export default function ProductCreatePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      status: "DRAFT",
    },
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const cats = await categoriesService.getList({ limit: 100 });
        if (!cancelled) setCategories(cats.data);
      } catch {
        if (!cancelled) setError("Failed to load categories.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    setError(null);
    try {
      await productsService.create(values);
      router.push("/products");
    } catch {
      setError("Failed to create product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add product</h1>
        <p className="text-muted-foreground mt-1">
          Create a new catalog product that will be synced to Odoo.
        </p>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle>Product details</CardTitle>
          <CardDescription>
            Fill in the basic catalog fields. After saving, the product will be pushed to Odoo using
            the configured sync.
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
                  <label className="block text-sm font-medium mb-1">Slug (optional)</label>
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
                  {saving ? "Saving..." : "Create product"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

