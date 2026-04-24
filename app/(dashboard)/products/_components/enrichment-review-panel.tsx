import { Button } from "@/components/ui/button";
import type { EnrichmentDiffItem, EnrichmentImageItem, ProposedDocumentItem } from "@/lib/enrichment-diff";
import { resolveBackendMediaUrl } from "@/lib/resolve-backend-media-url";

interface EnrichmentReviewPanelProps {
  diffItems: EnrichmentDiffItem[];
  fieldSelection: Record<string, boolean> | null;
  onFieldSelectionChange: (path: string, checked: boolean) => void;
  proposedImages: EnrichmentImageItem[];
  selectedProposedImageUrls: string[];
  onSelectedImagesChange: (urls: string[]) => void;
  proposedDocuments: ProposedDocumentItem[];
  selectedProposedDocumentUrls: string[];
  onSelectedDocumentsChange: (urls: string[]) => void;
  canApply: boolean;
  applying: boolean;
  onApply: () => void;
  onDiscard: () => void;
  emptyMessage?: string;
}

export function EnrichmentReviewPanel({
  diffItems,
  fieldSelection,
  onFieldSelectionChange,
  proposedImages,
  selectedProposedImageUrls,
  onSelectedImagesChange,
  proposedDocuments,
  selectedProposedDocumentUrls,
  onSelectedDocumentsChange,
  canApply,
  applying,
  onApply,
  onDiscard,
  emptyMessage = "Run enrichment to see proposed changes.",
}: EnrichmentReviewPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Enrichment review</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Compare old vs new values. Select fields to apply into the form.
        </p>
      </div>

      {diffItems.length > 0 && fieldSelection ? (
        <>
          <div className="space-y-2">
            {diffItems.map((item) => (
              <div
                key={item.path}
                className={`rounded-xl border p-3 ${item.changed ? "border-amber-500/30 bg-amber-500/10" : "border-border/60 bg-card"}`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-border"
                      checked={fieldSelection[item.path] ?? false}
                      disabled={!item.changed}
                      onChange={(e) => onFieldSelectionChange(item.path, e.target.checked)}
                    />
                    {item.label}
                  </label>
                  {item.changed && (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      changed
                    </span>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Old</p>
                    <div className="max-h-32 overflow-auto rounded-lg border border-border/60 bg-muted/30 px-2 py-1 text-sm">
                      {item.oldValue || "\u2014"}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">New</p>
                    <div className="max-h-32 overflow-auto rounded-lg border border-border/60 bg-muted/30 px-2 py-1 text-sm">
                      {item.newValue || "\u2014"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {proposedImages.length > 0 && (
            <div
              className={`rounded-xl border p-3 ${selectedProposedImageUrls.length > 0 ? "border-emerald-500/30 bg-emerald-500/10" : "border-border/60 bg-card"}`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border"
                    checked={selectedProposedImageUrls.length === proposedImages.length}
                    onChange={(e) =>
                      onSelectedImagesChange(
                        e.target.checked ? proposedImages.map((img) => img.url) : [],
                      )
                    }
                  />
                  Images ({selectedProposedImageUrls.length}/{proposedImages.length} selected)
                </label>
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  new
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {proposedImages.map((img, idx) => (
                  <label key={`${img.url}-${idx}`} className="relative block cursor-pointer">
                    <input
                      type="checkbox"
                      className="absolute left-1 top-1 z-10 size-4 rounded border-border bg-background/80"
                      checked={selectedProposedImageUrls.includes(img.url)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        onSelectedImagesChange(
                          checked
                            ? [...selectedProposedImageUrls, img.url]
                            : selectedProposedImageUrls.filter((url) => url !== img.url),
                        );
                      }}
                    />
                    <div className="relative size-20 overflow-hidden rounded-lg border border-border/60 bg-muted/20">
                      <img
                        src={resolveBackendMediaUrl(img.url)}
                        alt={img.alt || `Image ${idx + 1}`}
                        className="size-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {proposedDocuments.length > 0 && (
            <div
              className={`rounded-xl border p-3 ${selectedProposedDocumentUrls.length > 0 ? "border-emerald-500/30 bg-emerald-500/10" : "border-border/60 bg-card"}`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border"
                    checked={selectedProposedDocumentUrls.length === proposedDocuments.length}
                    onChange={(e) =>
                      onSelectedDocumentsChange(
                        e.target.checked ? proposedDocuments.map((doc) => doc.url) : [],
                      )
                    }
                  />
                  Downloads ({selectedProposedDocumentUrls.length}/{proposedDocuments.length}{" "}
                  selected)
                </label>
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  new
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {proposedDocuments.map((doc, idx) => (
                  <label key={`${doc.url}-${idx}`} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 rounded border-border bg-background/80"
                      checked={selectedProposedDocumentUrls.includes(doc.url)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        onSelectedDocumentsChange(
                          checked
                            ? [...selectedProposedDocumentUrls, doc.url]
                            : selectedProposedDocumentUrls.filter((url) => url !== doc.url),
                        );
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium break-words">{doc.title}</p>
                      {doc.type ? (
                        <p className="text-xs text-muted-foreground">
                          ({doc.type.replace(/_/g, " ")})
                        </p>
                      ) : null}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={onDiscard}
              disabled={applying}
            >
              Discard suggestions
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={onApply}
              disabled={!canApply || applying}
            >
              {applying ? "Applying..." : "Apply selected to form"}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      )}
    </div>
  );
}
