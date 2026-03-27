import { Download, FileText } from "lucide-react";
import type { ProductDocumentItem } from "@/services/products.service";

interface ProductDocumentsListProps {
  documents: ProductDocumentItem[];
  requiredTypes?: string[];
  missingRequiredTypes?: string[];
}

export function ProductDocumentsList({
  documents,
  requiredTypes = [],
  missingRequiredTypes = [],
}: ProductDocumentsListProps) {
  return (
    <div className="space-y-2 rounded-2xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Documents</h3>
        <span className="text-xs text-muted-foreground">{documents.length} available</span>
      </div>
      {requiredTypes.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Required by category: {requiredTypes.join(", ")}
          {missingRequiredTypes.length > 0 ? ` (missing: ${missingRequiredTypes.join(", ")})` : ""}
        </p>
      ) : null}
      {documents.length > 0 ? (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline break-words"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{doc.title}</span>
                </a>
                {doc.type ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    ({doc.type.replace(/_/g, " ")})
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-4 w-4" />
          No documents available.
        </p>
      )}
    </div>
  );
}
