export type FixedDiffPath =
  | "name"
  | "slug"
  | "description"
  | "metaTitle"
  | "metaDescription"
  | "metaKeywords"
  | "technicalSpecs"
  | "suggestedCategoryName"
  | "suggestedBrandName";

export type DiffPath = FixedDiffPath | `dynamic:${string}`;

export interface EnrichmentDiffItem {
  path: DiffPath;
  label: string;
  oldValue: string;
  newValue: string;
  changed: boolean;
  source: "fixed" | "dynamic";
}

export interface EnrichmentImageItem {
  url: string;
  alt: string;
}

export interface EnrichmentCandidateValues {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  metaTitle?: unknown;
  metaDescription?: unknown;
  metaKeywords?: unknown;
  suggestedCategoryName?: unknown;
  suggestedBrandName?: unknown;
  images?: EnrichmentImageItem[];
  documents?: { url?: unknown; title?: unknown; type?: unknown }[];
  technicalSpecs?: unknown;
}

export interface CurrentValues {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  metaTitle?: unknown;
  metaDescription?: unknown;
  metaKeywords?: unknown;
  technicalSpecs?: unknown;
  suggestedCategoryName?: unknown;
  suggestedBrandName?: unknown;
  geminiMappedFields?: unknown;
}

const FIELD_META: { path: FixedDiffPath; label: string }[] = [
  { path: "name", label: "Name" },
  { path: "slug", label: "Slug" },
  { path: "description", label: "Description" },
  { path: "metaTitle", label: "Meta title" },
  { path: "metaDescription", label: "Meta description" },
  { path: "metaKeywords", label: "Meta keywords" },
  { path: "technicalSpecs", label: "Technical specs" },
  { path: "suggestedCategoryName", label: "Suggested category" },
  { path: "suggestedBrandName", label: "Suggested brand" },
];

export function buildEnrichmentDiff(
  current: CurrentValues,
  mapped: EnrichmentCandidateValues | null | undefined,
  dynamicFields: Record<string, unknown> | null | undefined,
): EnrichmentDiffItem[] {
  const fixedItems = mapped
    ? FIELD_META.map(({ path, label }) => {
        const oldValue = normalizeByPath(path, current[path]);
        const newValue = normalizeByPath(path, mapped[path]);
        return {
          path,
          label,
          oldValue,
          newValue,
          changed: !!newValue && oldValue !== newValue,
          source: "fixed" as const,
        };
      })
    : [];

  const currentDynamic = flattenObject(
    current.geminiMappedFields && typeof current.geminiMappedFields === "object"
      ? (current.geminiMappedFields as Record<string, unknown>)
      : null,
  );
  const incomingDynamic = flattenObject(dynamicFields);
  const dynamicItems = Object.entries(incomingDynamic).map(([dynamicPath, incomingValue]) => {
    const oldValue = normalizeDynamicDisplay(currentDynamic[dynamicPath]);
    const newValue = normalizeDynamicDisplay(incomingValue);
    return {
      path: `dynamic:${dynamicPath}` as DiffPath,
      label: `Dynamic: ${dynamicPath}`,
      oldValue,
      newValue,
      changed: !!newValue && oldValue !== newValue,
      source: "dynamic" as const,
    };
  });

  return [...fixedItems, ...dynamicItems];
}

export function extractProposedImages(
  mapped: EnrichmentCandidateValues | null | undefined,
): EnrichmentImageItem[] {
  if (!mapped?.images || !Array.isArray(mapped.images)) return [];
  return mapped.images.filter((img): img is EnrichmentImageItem => !!img.url);
}

export interface ProposedDocumentItem {
  url: string;
  title: string;
  type?: string | null;
}

export function extractProposedDocuments(
  mapped: EnrichmentCandidateValues | null | undefined,
): ProposedDocumentItem[] {
  if (!mapped?.documents || !Array.isArray(mapped.documents)) return [];

  return mapped.documents
    .filter((doc) => !!doc && typeof doc === "object")
    .map((doc) => doc as { url?: unknown; title?: unknown; type?: unknown })
    .filter((doc): doc is ProposedDocumentItem => typeof doc.url === "string" && typeof doc.title === "string")
    .map((doc) => ({
      url: doc.url,
      title: doc.title,
      type: typeof doc.type === "string" ? doc.type : (doc.type ?? null),
    }));
}

export function defaultFieldSelection(items: EnrichmentDiffItem[]): Record<string, boolean> {
  return items.reduce<Record<string, boolean>>((acc, item) => {
    acc[item.path] = item.changed;
    return acc;
  }, {});
}

function normalizeByPath(path: FixedDiffPath, value: unknown): string {
  if (path === "technicalSpecs") {
    return normalizeDynamicDisplay(value);
  }
  return normalizeString(value);
}

function normalizeString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
}

function normalizeDynamicDisplay(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function flattenObject(
  value: Record<string, unknown> | null | undefined,
  basePath = "",
  output: Record<string, unknown> = {},
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return output;

  for (const [key, entryValue] of Object.entries(value)) {
    const path = basePath ? `${basePath}.${key}` : key;
    if (
      entryValue !== null &&
      typeof entryValue === "object" &&
      !Array.isArray(entryValue)
    ) {
      flattenObject(entryValue as Record<string, unknown>, path, output);
      continue;
    }
    if (Array.isArray(entryValue)) {
      output[path] = entryValue;
      continue;
    }
    output[path] = entryValue;
  }

  return output;
}
