import { z } from "zod";

const odooFormSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  defaultCode: z.string().optional(),
  barcode: z.string().optional(),
  type: z.enum(["product", "consu", "service"]).optional(),
  detailedType: z.enum(["product", "consu", "service"]).optional(),
  active: z.enum(["true", "false"]).optional(),
  saleOk: z.enum(["true", "false"]).optional(),
  purchaseOk: z.enum(["true", "false"]).optional(),
  listPrice: z.number().optional(),
  standardPrice: z.number().optional(),
  volume: z.number().optional(),
  odooWeight: z.number().optional(),
  categoryId: z.number().optional(),
  categoryName: z.string().optional(),
  uomId: z.number().optional(),
  uomName: z.string().optional(),
  purchaseUomId: z.number().optional(),
  purchaseUomName: z.string().optional(),
  taxesCsv: z.string().optional(),
  supplierTaxesCsv: z.string().optional(),
  tagsCsv: z.string().optional(),
  sellersCsv: z.string().optional(),
  variantSellersCsv: z.string().optional(),
  posCategoriesCsv: z.string().optional(),
  descriptionSale: z.string().optional(),
  websiteMetaTitle: z.string().optional(),
  websiteMetaDescription: z.string().optional(),
  websiteMetaKeywords: z.string().optional(),
});

const baseProductFields = {
  name: z.string().min(1, "Product name is required"),
  ean: z.string().min(1, "EAN is required"),
  sku: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  baseUnit: z.string().optional(),
  contentAmount: z.number().positive().optional(),
  pricePerUnit: z.number().positive().optional(),
  packSize: z.number().int().positive().optional(),
  storeAvailability: z.enum(["IN_STOCK", "LIMITED", "OUT_OF_STOCK"]).optional(),
  clickCollectEligible: z.boolean().optional(),
  categoryId: z.string().min(1, "Category is required"),
  brandId: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE"]).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  technicalSpecs: z.record(z.string(), z.unknown()).optional(),
  geminiMappedFields: z.record(z.string(), z.unknown()).optional(),
  badges: z.array(z.string()).optional(),
  productAttributes: z
    .array(
      z.object({
        definitionId: z.string(),
        valueId: z.string().optional(),
        valueText: z.string().optional(),
      })
    )
    .optional(),
  odoo: odooFormSchema,
};

export const createProductSchema = z.object(baseProductFields);

export const updateProductSchema = z.object({
  ...baseProductFields,
  name: baseProductFields.name.optional(),
  ean: baseProductFields.ean.optional(),
  sku: baseProductFields.sku.optional(),
  categoryId: baseProductFields.categoryId.optional(),
});

export type CreateProductFormValues = z.infer<typeof createProductSchema>;
export type UpdateProductFormValues = z.infer<typeof updateProductSchema>;
