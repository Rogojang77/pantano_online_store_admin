export type OdooBooleanSelect = "true" | "false";

export interface OdooFormValues {
  id?: number;
  name?: string;
  defaultCode?: string;
  barcode?: string;
  type?: "product" | "consu" | "service";
  detailedType?: "product" | "consu" | "service";
  active?: OdooBooleanSelect;
  saleOk?: OdooBooleanSelect;
  purchaseOk?: OdooBooleanSelect;
  listPrice?: number;
  standardPrice?: number;
  volume?: number;
  odooWeight?: number;
  categoryId?: number;
  categoryName?: string;
  uomId?: number;
  uomName?: string;
  purchaseUomId?: number;
  purchaseUomName?: string;
  taxesCsv?: string;
  supplierTaxesCsv?: string;
  tagsCsv?: string;
  sellersCsv?: string;
  variantSellersCsv?: string;
  posCategoriesCsv?: string;
  descriptionSale?: string;
  websiteMetaTitle?: string;
  websiteMetaDescription?: string;
  websiteMetaKeywords?: string;
}

function csvToNumberArray(value?: string): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n));
}

function numberArrayToCsv(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n))
    .join(", ");
}

function normalizeTextOrNull(value?: string): string | null {
  if (value == null) return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function buildOdooProductDetail(args: {
  name: string;
  sku: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  odoo: OdooFormValues;
  extra?: Record<string, unknown>;
}) {
  const { name, sku, description, metaTitle, metaDescription, metaKeywords, odoo, extra } = args;
  const odooName = normalizeTextOrNull(odoo.name);

  const category =
    Number.isFinite(odoo.categoryId) && odoo.categoryName?.trim()
      ? { id: Number(odoo.categoryId), name: odoo.categoryName.trim() }
      : null;
  const uom =
    Number.isFinite(odoo.uomId) && odoo.uomName?.trim()
      ? { id: Number(odoo.uomId), name: odoo.uomName.trim() }
      : null;
  const purchaseUom =
    Number.isFinite(odoo.purchaseUomId) && odoo.purchaseUomName?.trim()
      ? { id: Number(odoo.purchaseUomId), name: odoo.purchaseUomName.trim() }
      : null;

  return {
    ...(extra ?? {}),
    ...(Number.isFinite(odoo.id) ? { id: Number(odoo.id) } : {}),
    ...(uom ? { uom } : {}),
    name: odooName ?? name,
    tags: csvToNumberArray(odoo.tagsCsv),
    type: odoo.type ?? "product",
    taxes: csvToNumberArray(odoo.taxesCsv),
    active: (odoo.active ?? "true") === "true",
    saleOk: (odoo.saleOk ?? "true") === "true",
    volume: odoo.volume ?? 0,
    weight: odoo.odooWeight ?? 0,
    barcode: normalizeTextOrNull(odoo.barcode),
    sellers: csvToNumberArray(odoo.sellersCsv),
    ...(category ? { category } : {}),
    listPrice: odoo.listPrice ?? 0,
    purchaseOk: (odoo.purchaseOk ?? "true") === "true",
    defaultCode: normalizeTextOrNull(odoo.defaultCode) ?? sku,
    description: normalizeTextOrNull(description),
    ...(purchaseUom ? { purchaseUom } : {}),
    detailedType: odoo.detailedType ?? "product",
    posCategories: csvToNumberArray(odoo.posCategoriesCsv),
    standardPrice: odoo.standardPrice ?? 0,
    supplierTaxes: csvToNumberArray(odoo.supplierTaxesCsv),
    variantSellers: csvToNumberArray(odoo.variantSellersCsv),
    descriptionSale: normalizeTextOrNull(odoo.descriptionSale),
    websiteMetaTitle: normalizeTextOrNull(odoo.websiteMetaTitle ?? metaTitle),
    websiteMetaKeywords: normalizeTextOrNull(odoo.websiteMetaKeywords ?? metaKeywords),
    websiteMetaDescription: normalizeTextOrNull(odoo.websiteMetaDescription ?? metaDescription),
  };
}

export function extractOdooFormValues(productDetail: Record<string, unknown>): OdooFormValues {
  const category =
    productDetail.category && typeof productDetail.category === "object"
      ? (productDetail.category as Record<string, unknown>)
      : {};
  const uom =
    productDetail.uom && typeof productDetail.uom === "object"
      ? (productDetail.uom as Record<string, unknown>)
      : {};
  const purchaseUom =
    productDetail.purchaseUom && typeof productDetail.purchaseUom === "object"
      ? (productDetail.purchaseUom as Record<string, unknown>)
      : {};

  return {
    id: Number.isFinite(Number(productDetail.id)) ? Number(productDetail.id) : undefined,
    name: typeof productDetail.name === "string" ? productDetail.name : undefined,
    defaultCode: typeof productDetail.defaultCode === "string" ? productDetail.defaultCode : undefined,
    barcode: typeof productDetail.barcode === "string" ? productDetail.barcode : undefined,
    type:
      productDetail.type === "product" || productDetail.type === "consu" || productDetail.type === "service"
        ? productDetail.type
        : "product",
    detailedType:
      productDetail.detailedType === "product" ||
      productDetail.detailedType === "consu" ||
      productDetail.detailedType === "service"
        ? productDetail.detailedType
        : "product",
    active: productDetail.active === false ? "false" : "true",
    saleOk: productDetail.saleOk === false ? "false" : "true",
    purchaseOk: productDetail.purchaseOk === false ? "false" : "true",
    listPrice: Number.isFinite(Number(productDetail.listPrice)) ? Number(productDetail.listPrice) : undefined,
    standardPrice: Number.isFinite(Number(productDetail.standardPrice)) ? Number(productDetail.standardPrice) : undefined,
    volume: Number.isFinite(Number(productDetail.volume)) ? Number(productDetail.volume) : undefined,
    odooWeight: Number.isFinite(Number(productDetail.weight)) ? Number(productDetail.weight) : undefined,
    categoryId: Number.isFinite(Number(category.id)) ? Number(category.id) : undefined,
    categoryName: typeof category.name === "string" ? category.name : undefined,
    uomId: Number.isFinite(Number(uom.id)) ? Number(uom.id) : undefined,
    uomName: typeof uom.name === "string" ? uom.name : undefined,
    purchaseUomId: Number.isFinite(Number(purchaseUom.id)) ? Number(purchaseUom.id) : undefined,
    purchaseUomName: typeof purchaseUom.name === "string" ? purchaseUom.name : undefined,
    taxesCsv: numberArrayToCsv(productDetail.taxes),
    supplierTaxesCsv: numberArrayToCsv(productDetail.supplierTaxes),
    tagsCsv: numberArrayToCsv(productDetail.tags),
    sellersCsv: numberArrayToCsv(productDetail.sellers),
    variantSellersCsv: numberArrayToCsv(productDetail.variantSellers),
    posCategoriesCsv: numberArrayToCsv(productDetail.posCategories),
    descriptionSale: typeof productDetail.descriptionSale === "string" ? productDetail.descriptionSale : undefined,
    websiteMetaTitle: typeof productDetail.websiteMetaTitle === "string" ? productDetail.websiteMetaTitle : undefined,
    websiteMetaDescription:
      typeof productDetail.websiteMetaDescription === "string" ? productDetail.websiteMetaDescription : undefined,
    websiteMetaKeywords:
      typeof productDetail.websiteMetaKeywords === "string" ? productDetail.websiteMetaKeywords : undefined,
  };
}
