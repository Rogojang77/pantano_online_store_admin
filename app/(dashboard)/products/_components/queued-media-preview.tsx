import type { EnrichmentImageItem, ProposedDocumentItem } from "@/lib/enrichment-diff";

interface QueuedMediaPreviewProps {
  pendingImages: EnrichmentImageItem[];
  pendingDocuments: ProposedDocumentItem[];
}

export function QueuedMediaPreview({ pendingImages, pendingDocuments }: QueuedMediaPreviewProps) {
  return (
    <div className="space-y-2 rounded-2xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Queued media</h3>
        <span className="text-xs text-muted-foreground">
          {pendingImages.length} images &middot; {pendingDocuments.length} documents
        </span>
      </div>

      {pendingImages.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {pendingImages.map((img, idx) => (
            <div
              key={`${img.url}-${idx}`}
              className="relative size-20 overflow-hidden rounded-lg border border-border/60 bg-muted/20"
            >
              <img
                src={img.url}
                alt={img.alt || `Image ${idx + 1}`}
                className="size-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No queued images yet.</p>
      )}

      {pendingDocuments.length > 0 ? (
        <ul className="space-y-2 pt-2">
          {pendingDocuments.map((doc, idx) => (
            <li key={`${doc.url}-${idx}`} className="text-sm">
              {doc.title}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground pt-2">No queued documents yet.</p>
      )}
    </div>
  );
}
