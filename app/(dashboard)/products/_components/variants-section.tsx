"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  productsService,
  type ProductVariantItem,
  type CreateVariantPayload,
} from "@/services/products.service";

interface VariantsSectionProps {
  productId: string;
  variants: ProductVariantItem[];
  onVariantsChanged: () => void;
}

interface VariantDraft {
  sku: string;
  name: string;
  price: string;
  compareAtPrice: string;
  isActive: boolean;
}

const emptyDraft: VariantDraft = { sku: "", name: "", price: "", compareAtPrice: "", isActive: true };

export function VariantsSection({ productId, variants, onVariantsChanged }: VariantsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<VariantDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<VariantDraft>(emptyDraft);
  const [editSaving, setEditSaving] = useState(false);

  const handleCreate = async () => {
    if (!draft.sku.trim() || !draft.price.trim()) {
      toast.error("SKU and price are required");
      return;
    }
    setSaving(true);
    try {
      const payload: CreateVariantPayload = {
        productId,
        sku: draft.sku.trim(),
        name: draft.name.trim() || undefined,
        price: Number(draft.price),
        compareAtPrice: draft.compareAtPrice ? Number(draft.compareAtPrice) : undefined,
        isActive: draft.isActive,
      };
      await productsService.createVariant(payload);
      toast.success("Variant created");
      setDraft(emptyDraft);
      setShowForm(false);
      onVariantsChanged();
    } catch {
      toast.error("Failed to create variant");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (v: ProductVariantItem) => {
    setEditingId(v.id);
    setEditDraft({
      sku: v.sku,
      name: v.name ?? "",
      price: String(v.price),
      compareAtPrice: v.compareAtPrice != null ? String(v.compareAtPrice) : "",
      isActive: v.isActive,
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setEditSaving(true);
    try {
      await productsService.updateVariant(editingId, {
        sku: editDraft.sku.trim() || undefined,
        name: editDraft.name.trim() || undefined,
        price: editDraft.price ? Number(editDraft.price) : undefined,
        compareAtPrice: editDraft.compareAtPrice ? Number(editDraft.compareAtPrice) : undefined,
        isActive: editDraft.isActive,
      });
      toast.success("Variant updated");
      setEditingId(null);
      onVariantsChanged();
    } catch {
      toast.error("Failed to update variant");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Variants</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{variants.length} variant(s)</span>
          {!showForm && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={() => setShowForm(true)}
            >
              <Plus className="size-3.5 mr-1" />
              Add
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">New variant</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input
              placeholder="SKU *"
              className="rounded-xl"
              value={draft.sku}
              onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
            />
            <Input
              placeholder="Name"
              className="rounded-xl"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
            <Input
              type="number"
              step="any"
              placeholder="Price *"
              className="rounded-xl"
              value={draft.price}
              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
            />
            <Input
              type="number"
              step="any"
              placeholder="Compare-at price"
              className="rounded-xl"
              value={draft.compareAtPrice}
              onChange={(e) => setDraft((d) => ({ ...d, compareAtPrice: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={() => { setShowForm(false); setDraft(emptyDraft); }}
            >
              <X className="size-3.5 mr-1" />
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-lg"
              onClick={handleCreate}
              disabled={saving}
            >
              <Save className="size-3.5 mr-1" />
              {saving ? "Saving..." : "Create"}
            </Button>
          </div>
        </div>
      )}

      {variants.length > 0 ? (
        <div className="space-y-2">
          {variants.map((v) =>
            editingId === v.id ? (
              <div key={v.id} className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <Input
                    placeholder="SKU"
                    className="rounded-xl"
                    value={editDraft.sku}
                    onChange={(e) => setEditDraft((d) => ({ ...d, sku: e.target.value }))}
                  />
                  <Input
                    placeholder="Name"
                    className="rounded-xl"
                    value={editDraft.name}
                    onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                  />
                  <Input
                    type="number"
                    step="any"
                    placeholder="Price"
                    className="rounded-xl"
                    value={editDraft.price}
                    onChange={(e) => setEditDraft((d) => ({ ...d, price: e.target.value }))}
                  />
                  <Input
                    type="number"
                    step="any"
                    placeholder="Compare-at price"
                    className="rounded-xl"
                    value={editDraft.compareAtPrice}
                    onChange={(e) => setEditDraft((d) => ({ ...d, compareAtPrice: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-border"
                      checked={editDraft.isActive}
                      onChange={(e) => setEditDraft((d) => ({ ...d, isActive: e.target.checked }))}
                    />
                    Active
                  </label>
                  <div className="ml-auto flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-lg"
                      onClick={handleUpdate}
                      disabled={editSaving}
                    >
                      {editSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={v.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/10 p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{v.sku}</span>
                    {v.name && <span className="text-sm text-muted-foreground">&mdash; {v.name}</span>}
                    <Badge variant={v.isActive ? "success" : "secondary"}>
                      {v.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                    <span>Price: {v.price}</span>
                    {v.compareAtPrice != null && <span>Compare: {v.compareAtPrice}</span>}
                    {v.variantAttributes && v.variantAttributes.length > 0 && (
                      <span>
                        {v.variantAttributes
                          .map((a) => `${a.definition?.name ?? a.definitionId}: ${a.value?.value ?? a.valueId}`)
                          .join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-lg shrink-0"
                  onClick={() => startEdit(v)}
                >
                  Edit
                </Button>
              </div>
            ),
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No variants yet.</p>
      )}
    </div>
  );
}
