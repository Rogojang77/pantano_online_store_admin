import type { BrandItem } from "@/services/brands.service";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const NO_BRAND_CANDIDATES = new Set([
  "no brand",
  "nobrand",
  "unbranded",
  "without brand",
  "fara brand",
  "fara marca",
]);

export function resolveNoBrandId(brands: BrandItem[]): string | undefined {
  for (const brand of brands) {
    const normalizedName = normalize(brand.name);
    const normalizedSlug = normalize(brand.slug);
    if (NO_BRAND_CANDIDATES.has(normalizedName) || NO_BRAND_CANDIDATES.has(normalizedSlug)) {
      return brand.id;
    }
  }
  return undefined;
}

