import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ProductImageItem } from "@/services/products.service";

interface ProductImageManagerProps {
  images: ProductImageItem[];
  imageAltDrafts: Record<string, string>;
  onAltChange: (imageId: string, value: string) => void;
  onSaveAlt: (imageId: string) => void;
  onSetPrimary: (imageId: string) => void;
  onDelete: (imageId: string) => void;
  savingId: string | null;
  deletingId: string | null;
}

export function ProductImageManager({
  images,
  imageAltDrafts,
  onAltChange,
  onSaveAlt,
  onSetPrimary,
  onDelete,
  savingId,
  deletingId,
}: ProductImageManagerProps) {
  return (
    <div className="space-y-2 rounded-2xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Product images</h3>
        <span className="text-xs text-muted-foreground">{images.length} saved</span>
      </div>
      {images.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <div key={img.id} className="rounded-lg border border-border/60 bg-muted/10 p-2">
              <div className="relative mb-2 size-24 overflow-hidden rounded-lg border border-border/60 bg-muted/20">
                <img
                  src={img.url}
                  alt={img.alt || "Product image"}
                  className="size-full object-cover"
                  loading="lazy"
                />
                {img.isPrimary && (
                  <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                    Primary
                  </span>
                )}
              </div>
              <Input
                className="mb-2 rounded-xl"
                placeholder="Alt text"
                value={imageAltDrafts[img.id] ?? ""}
                onChange={(e) => onAltChange(img.id, e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => onSaveAlt(img.id)}
                  disabled={savingId === img.id || deletingId === img.id}
                >
                  {savingId === img.id ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => onSetPrimary(img.id)}
                  disabled={img.isPrimary || savingId === img.id || deletingId === img.id}
                >
                  Set primary
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="rounded-lg"
                  onClick={() => onDelete(img.id)}
                  disabled={deletingId === img.id || savingId === img.id}
                >
                  {deletingId === img.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No images saved yet.</p>
      )}
    </div>
  );
}
