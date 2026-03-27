import {
  buildEnrichmentDiff,
  defaultFieldSelection,
  extractProposedDocuments,
  extractProposedImages,
  type CurrentValues,
  type EnrichmentCandidateValues,
  type EnrichmentDiffItem,
  type EnrichmentImageItem,
  type ProposedDocumentItem,
} from "@/lib/enrichment-diff";

export interface GeminiPreviewState {
  diffItems: EnrichmentDiffItem[];
  fieldSelection: Record<string, boolean>;
  mappedPreview: Record<string, unknown> | null;
  dynamicPreview: Record<string, unknown> | null;
  proposedImages: EnrichmentImageItem[];
  selectedProposedImageUrls: string[];
  proposedDocuments: ProposedDocumentItem[];
  selectedProposedDocumentUrls: string[];
  changedCount: number;
}

export function buildGeminiPreviewState(input: {
  current: CurrentValues;
  mappedFields: Record<string, unknown> | null;
  dynamicFields: Record<string, unknown> | null;
  includeMedia?: boolean;
}): GeminiPreviewState {
  const { current, mappedFields, dynamicFields, includeMedia = false } = input;
  const diffItems = buildEnrichmentDiff(
    current,
    mappedFields as EnrichmentCandidateValues | null,
    dynamicFields,
  );
  const fieldSelection = defaultFieldSelection(diffItems);
  const changedCount = diffItems.filter((item) => item.changed).length;

  const proposedImages = includeMedia
    ? extractProposedImages(mappedFields as EnrichmentCandidateValues | null)
    : [];
  const proposedDocuments = includeMedia
    ? extractProposedDocuments(mappedFields as EnrichmentCandidateValues | null)
    : [];

  return {
    diffItems,
    fieldSelection,
    mappedPreview: mappedFields,
    dynamicPreview: dynamicFields,
    proposedImages,
    selectedProposedImageUrls: proposedImages.map((img) => img.url),
    proposedDocuments,
    selectedProposedDocumentUrls: proposedDocuments.map((doc) => doc.url),
    changedCount,
  };
}
