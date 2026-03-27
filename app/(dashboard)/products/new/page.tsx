"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  productsService,
  type CreateProductPayload,
  type ProductAttributeInputItem,
} from "@/services/products.service";
import { geminiEnrichmentService } from "@/services/gemini-enrichment.service";
import { icecatService } from "@/services/icecat.service";
import {
  type EnrichmentDiffItem,
  type EnrichmentImageItem,
  type ProposedDocumentItem,
} from "@/lib/enrichment-diff";
import { buildGeminiPreviewState } from "@/lib/gemini-enrichment-preview";
import { normalizeLookupValue } from "@/lib/string-utils";
import { createProductSchema, type CreateProductFormValues } from "@/lib/validation/product-form.schema";
import { mapApiErrorToForm } from "@/lib/validation/api-error";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { CatalogFields } from "../_components/catalog-fields";
import { ShopperCommercialFields } from "../_components/shopper-commercial-fields";
import { RequiredAttributesPanel } from "../_components/required-attributes-panel";
import { SeoMetaFields } from "../_components/seo-meta-fields";
import { OdooFields } from "../_components/odoo-fields";
import { OdooExtraJsonField } from "../_components/odoo-extra-json-field";
import { EnrichmentReviewPanel } from "../_components/enrichment-review-panel";
import { QueuedMediaPreview } from "../_components/queued-media-preview";
import { useCategoriesAndBrands } from "../_hooks/use-categories-and-brands";
import { useEffectiveCategoryAttributesQuery } from "../_hooks/use-product-queries";
import { useOdooExtraJson } from "../_hooks/use-odoo-extra-json";
import { resolveNoBrandId } from "../_lib/no-brand";

type FormValues = CreateProductFormValues;
const DYNAMIC_PATH_PREFIX = "dynamic:";

function getValueByPath(source: Record<string, unknown>, path: string): unknown {
  const segments = path.split(".").filter(Boolean);
  let current: unknown = source;
  for (const segment of segments) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function setValueByPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) return;

  let current: Record<string, unknown> = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    const next = current[segment];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }
  current[segments[segments.length - 1]] = value;
}

export default function ProductCreatePage() {
  const router = useRouter();
  const { categories, brands, loading, error: lookupError } = useCategoriesAndBrands();
  const {
    odooFieldsJson,
    setOdooFieldsJson,
    odooFieldsError,
    setOdooFieldsError,
  } = useOdooExtraJson();

  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [applyingEnrichment, setApplyingEnrichment] = useState(false);
  const [error, setPageError] = useState<string | null>(null);

  const [diffItems, setDiffItems] = useState<EnrichmentDiffItem[]>([]);
  const [fieldSelection, setFieldSelection] = useState<Record<string, boolean> | null>(null);
  const [mappedPreview, setMappedPreview] = useState<Record<string, unknown> | null>(null);
  const [dynamicPreview, setDynamicPreview] = useState<Record<string, unknown> | null>(null);
  const [proposedImages, setProposedImages] = useState<EnrichmentImageItem[]>([]);
  const [selectedProposedImageUrls, setSelectedProposedImageUrls] = useState<string[]>([]);
  const [pendingImages, setPendingImages] = useState<EnrichmentImageItem[]>([]);
  const [proposedDocuments, setProposedDocuments] = useState<ProposedDocumentItem[]>([]);
  const [selectedProposedDocumentUrls, setSelectedProposedDocumentUrls] = useState<string[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<ProposedDocumentItem[]>([]);
  const [pendingIcecatTechnicalSpecs, setPendingIcecatTechnicalSpecs] = useState<Record<string, unknown> | null>(null);
  const [pendingGeminiMappedFields, setPendingGeminiMappedFields] = useState<Record<string, unknown> | null>(null);
  const [selectedProductAttributes, setSelectedProductAttributes] = useState<ProductAttributeInputItem[]>([]);
  const [technicalSpecsDraft, setTechnicalSpecsDraft] = useState("{}");
  const [technicalSpecsError, setTechnicalSpecsError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    setError: setFormError,
    formState: { errors: formErrors },
  } = useForm<FormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      status: "DRAFT",
      odoo: {
        type: "product",
        detailedType: "product",
        active: "true",
        saleOk: "true",
        purchaseOk: "true",
      },
    },
  });
  const watchedCategoryId = watch("categoryId");
  const watchedContentAmount = watch("contentAmount");
  const watchedExplicitPricePerUnit = watch("pricePerUnit");
  const watchedListPrice = watch("odoo.listPrice");
  const watchedStoreAvailability = watch("storeAvailability");
  const { data: effectiveAttributes = [] } = useEffectiveCategoryAttributesQuery(watchedCategoryId);

  const getCategoryNameById = (categoryId: string | null | undefined): string => {
    if (!categoryId) return "";
    return categories.find((item) => item.id === categoryId)?.name ?? "";
  };

  const getBrandNameById = (brandId: string | null | undefined): string => {
    if (!brandId) return "";
    return brands.find((item) => item.id === brandId)?.name ?? "";
  };

  const handleEnrich = async () => {
    const values = getValues();
    if (!values.name?.trim()) {
      toast.error("Add a product name first to preview Gemini enrichment.");
      return;
    }

    let parsedTechnicalSpecs: Record<string, unknown> | null = null;
    const rawTechnicalSpecs = technicalSpecsDraft.trim();
    if (rawTechnicalSpecs) {
      try {
        const parsed = JSON.parse(rawTechnicalSpecs);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          parsedTechnicalSpecs = parsed as Record<string, unknown>;
        }
      } catch {
        // Skip invalid technical specs for preview; submit path still enforces validation.
      }
    }

    setEnriching(true);
    try {
      const preview = await geminiEnrichmentService.previewDraft({
        sku: values.sku,
        name: values.name,
        description: values.description ?? null,
        brand: getBrandNameById(values.brandId),
        technicalSpecs: parsedTechnicalSpecs ?? pendingIcecatTechnicalSpecs ?? {},
      });
      const hasMappedFields = !!preview.mappedFields && Object.keys(preview.mappedFields).length > 0;
      const hasDynamicFields = !!preview.dynamicFields && Object.keys(preview.dynamicFields).length > 0;
      if (hasMappedFields || hasDynamicFields) {
        const previewState = buildGeminiPreviewState({
          current: {
            name: values.name,
            description: values.description,
            metaTitle: values.metaTitle,
            metaDescription: values.metaDescription,
            metaKeywords: values.metaKeywords,
            technicalSpecs: parsedTechnicalSpecs ?? pendingIcecatTechnicalSpecs ?? null,
            suggestedCategoryName: getCategoryNameById(values.categoryId),
            suggestedBrandName: getBrandNameById(values.brandId),
            geminiMappedFields: pendingGeminiMappedFields ?? null,
          },
          mappedFields: preview.mappedFields,
          dynamicFields: preview.dynamicFields,
          includeMedia: false,
        });
        setDiffItems(previewState.diffItems);
        setFieldSelection(previewState.fieldSelection);
        setMappedPreview(previewState.mappedPreview);
        setDynamicPreview(previewState.dynamicPreview);
        setProposedImages(previewState.proposedImages);
        setSelectedProposedImageUrls(previewState.selectedProposedImageUrls);
        setProposedDocuments(previewState.proposedDocuments);
        setSelectedProposedDocumentUrls(previewState.selectedProposedDocumentUrls);
        setPendingIcecatTechnicalSpecs(null);
        setPendingGeminiMappedFields(null);
        if (!hasMappedFields && hasDynamicFields) {
          toast.info(
            preview.geminiResult.message ??
              "Gemini found extra info, but couldn't map standard fields. Review dynamic fields below.",
          );
        } else {
          toast.success(`Gemini preview loaded: ${previewState.changedCount} field changes`);
        }
      } else {
        discardSuggestions();
        toast.error(preview.geminiResult.error || "Gemini returned no enrichment suggestions");
      }
    } catch {
      discardSuggestions();
      toast.error("Failed to preview enrichment from Gemini");
    } finally {
      setEnriching(false);
    }
  };

  const applySelectedChanges = () => {
    if (!fieldSelection || applyingEnrichment) return;
    if (!mappedPreview && !dynamicPreview) return;

    setApplyingEnrichment(true);
    try {
      let changed = 0;
      if (mappedPreview && fieldSelection.technicalSpecs) {
        setPendingIcecatTechnicalSpecs(
          mappedPreview.technicalSpecs && typeof mappedPreview.technicalSpecs === "object"
            ? (mappedPreview.technicalSpecs as Record<string, unknown>)
            : null,
        );
      }
      if (mappedPreview?.technicalSpecs && typeof mappedPreview.technicalSpecs === "object") {
        const { odoo: _mappedLegacyOdoo, ...mappedShopperSpecs } =
          mappedPreview.technicalSpecs as Record<string, unknown>;
        setTechnicalSpecsDraft(JSON.stringify(mappedShopperSpecs, null, 2));
        setTechnicalSpecsError(null);
      }
      const textMapping: Array<"name" | "description" | "metaTitle" | "metaDescription" | "metaKeywords"> = [
        "name", "description", "metaTitle", "metaDescription", "metaKeywords",
      ];
      for (const path of textMapping) {
        if (!mappedPreview) continue;
        if (!fieldSelection[path]) continue;
        const value = mappedPreview[path];
        if (typeof value === "string" && value.trim()) {
          setValue(path, value as never, { shouldDirty: true, shouldTouch: true });
          changed += 1;
        }
      }

      if (mappedPreview && fieldSelection.suggestedCategoryName) {
        const suggestedCategoryName = typeof mappedPreview.suggestedCategoryName === "string"
          ? mappedPreview.suggestedCategoryName.trim()
          : "";
        if (suggestedCategoryName) {
          const normalized = normalizeLookupValue(suggestedCategoryName);
          const match = categories.find((item) => {
            const candidates = [item.name, item.normalizedName ?? ""];
            return candidates.some((c) => c && normalizeLookupValue(c) === normalized);
          });
          if (match) {
            setValue("categoryId", match.id, { shouldDirty: true, shouldTouch: true });
            changed += 1;
          } else {
            toast.info(`Category suggestion not matched: ${suggestedCategoryName}`);
          }
        }
      }

      if (mappedPreview && fieldSelection.suggestedBrandName) {
        const suggestedBrandName = typeof mappedPreview.suggestedBrandName === "string"
          ? mappedPreview.suggestedBrandName.trim()
          : "";
        if (suggestedBrandName) {
          const normalized = normalizeLookupValue(suggestedBrandName);
          const match = brands.find((item) => normalizeLookupValue(item.name) === normalized);
          if (match) {
            setValue("brandId", match.id, { shouldDirty: true, shouldTouch: true });
            changed += 1;
          } else {
            toast.info(`Brand suggestion not matched: ${suggestedBrandName}`);
          }
        }
      }

      if (dynamicPreview) {
        const selectedDynamicPaths = diffItems
          .filter(
            (item) =>
              item.source === "dynamic" &&
              item.changed &&
              fieldSelection[item.path] &&
              item.path.startsWith(DYNAMIC_PATH_PREFIX),
          )
          .map((item) => item.path.slice(DYNAMIC_PATH_PREFIX.length))
          .filter(Boolean);

        if (selectedDynamicPaths.length > 0) {
          const nextDynamic: Record<string, unknown> = { ...(pendingGeminiMappedFields ?? {}) };
          for (const dynamicPath of selectedDynamicPaths) {
            const dynamicValue = getValueByPath(dynamicPreview, dynamicPath);
            if (dynamicValue === undefined) continue;
            setValueByPath(nextDynamic, dynamicPath, dynamicValue);
          }
          setPendingGeminiMappedFields(nextDynamic);
          changed += selectedDynamicPaths.length;
        }
      }

      setPendingImages([]);
      setPendingDocuments([]);

      toast.success(changed > 0 ? `${changed} field(s) queued for save` : "No fields selected");
    } finally {
      setApplyingEnrichment(false);
    }
  };

  const discardSuggestions = () => {
    setDiffItems([]);
    setFieldSelection(null);
    setMappedPreview(null);
    setDynamicPreview(null);
    setProposedImages([]);
    setSelectedProposedImageUrls([]);
    setProposedDocuments([]);
    setSelectedProposedDocumentUrls([]);
    setPendingImages([]);
    setPendingDocuments([]);
    setPendingIcecatTechnicalSpecs(null);
    setPendingGeminiMappedFields(null);
    setSelectedProductAttributes([]);
    setTechnicalSpecsError(null);
  };

  const changedFieldsSelectedCount = fieldSelection
    ? diffItems.filter((item) => item.changed && fieldSelection[item.path]).length
    : 0;
  const canApplyEnrichment =
    changedFieldsSelectedCount > 0 ||
    selectedProposedImageUrls.length > 0 ||
    selectedProposedDocumentUrls.length > 0;
  const derivedPricePerUnit =
    watchedExplicitPricePerUnit ??
    (typeof watchedListPrice === "number" &&
    typeof watchedContentAmount === "number" &&
    watchedContentAmount > 0
      ? watchedListPrice / watchedContentAmount
      : null);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    setPageError(null);
    setOdooFieldsError(null);

    try {
      let parsedTechnicalSpecs: Record<string, unknown> = {};
      const rawTechnicalSpecs = technicalSpecsDraft.trim();
      if (rawTechnicalSpecs) {
        try {
          const parsed = JSON.parse(rawTechnicalSpecs);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            setTechnicalSpecsError("Technical specs must be a JSON object.");
            setSaving(false);
            return;
          }
          parsedTechnicalSpecs = parsed as Record<string, unknown>;
        } catch {
          setTechnicalSpecsError("Technical specs JSON is invalid.");
          setSaving(false);
          return;
        }
      }
      setTechnicalSpecsError(null);

      const { odoo: _ignoredOdooValues, ...productValues } = values;
      const technicalSpecsSource =
        Object.keys(parsedTechnicalSpecs).length > 0
          ? parsedTechnicalSpecs
          : (pendingIcecatTechnicalSpecs ?? {});
      const { odoo: _ignoredOdooSpecs, ...shopperTechnicalSpecs } = technicalSpecsSource;

      const payload: CreateProductPayload = {
        ...productValues,
        brandId:
          productValues.brandId?.trim() ||
          resolveNoBrandId(brands),
        productAttributes: selectedProductAttributes,
        pricePerUnit:
          productValues.pricePerUnit ??
          (typeof values.odoo?.listPrice === "number" &&
          typeof productValues.contentAmount === "number" &&
          productValues.contentAmount > 0
            ? values.odoo.listPrice / productValues.contentAmount
            : undefined),
        geminiMappedFields: pendingGeminiMappedFields ?? undefined,
        technicalSpecs: shopperTechnicalSpecs,
      };

      if (!payload.brandId) {
        setFormError("brandId", {
          type: "manual",
          message: 'Select a brand or create a "No Brand" brand first.',
        });
        setSaving(false);
        return;
      }

      const created = await productsService.create(payload);

      if (pendingImages.length > 0 && created?.id) {
        try {
          await icecatService.downloadImages({
            productId: created.id,
            images: pendingImages.map((img) => ({ url: img.url, alt: img.alt })),
          });
        } catch {
          toast.error("Product created but some images failed to download.");
        }
      }

      if (pendingDocuments.length > 0 && created?.id) {
        try {
          await icecatService.downloadDocuments({
            productId: created.id,
            documents: pendingDocuments,
          });
        } catch {
          toast.error("Product created but some documents failed to download.");
        }
      }

      router.push("/products");
    } catch (err) {
      setPageError(mapApiErrorToForm(err, setFormError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add product</h1>
          <p className="text-muted-foreground mt-1">
            Create a new catalog product that will be synced to Odoo.
          </p>
        </div>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle>Product details</CardTitle>
          <CardDescription>
            Fill in the basic catalog fields. After saving, the product will be pushed to Odoo using
            the configured sync.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {(error || lookupError) && (
                <p className="text-sm text-red-500">{error || lookupError}</p>
              )}

              <Tabs defaultValue="catalog" className="w-full">
                <TabsList className="grid w-full grid-cols-3 rounded-xl">
                  <TabsTrigger value="catalog" type="button" className="rounded-lg">
                    Catalog
                  </TabsTrigger>
                  <TabsTrigger value="odoo" type="button" className="rounded-lg">
                    Odoo
                  </TabsTrigger>
                  <TabsTrigger value="media" type="button" className="rounded-lg">
                    Media
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="catalog" forceMount className="mt-4 space-y-6">
                  <CatalogFields
                    register={register}
                    categories={categories}
                    brands={brands}
                    errors={formErrors}
                    slugLabel="Slug (optional)"
                  />
                  <ShopperCommercialFields
                    register={register}
                    derivedPricePerUnit={derivedPricePerUnit}
                    storeAvailability={watchedStoreAvailability}
                    technicalSpecsJson={technicalSpecsDraft}
                    onTechnicalSpecsChange={setTechnicalSpecsDraft}
                    technicalSpecsError={technicalSpecsError}
                  />
                  <RequiredAttributesPanel
                    requirements={effectiveAttributes}
                    values={selectedProductAttributes}
                    onChange={setSelectedProductAttributes}
                  />
                  <SeoMetaFields register={register} />
                  <div className="space-y-3 rounded-2xl border border-border/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">Gemini enrichment</h3>
                        <p className="text-xs text-muted-foreground">
                          Generate content suggestions and review before applying.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl shrink-0"
                        onClick={handleEnrich}
                        disabled={enriching || loading}
                      >
                        {enriching ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Enriching...
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-4" />
                            Enrich with Gemini
                          </>
                        )}
                      </Button>
                    </div>
                    <EnrichmentReviewPanel
                      diffItems={diffItems}
                      fieldSelection={fieldSelection}
                      onFieldSelectionChange={(path, checked) =>
                        setFieldSelection((prev) => (prev ? { ...prev, [path]: checked } : prev))
                      }
                      proposedImages={proposedImages}
                      selectedProposedImageUrls={selectedProposedImageUrls}
                      onSelectedImagesChange={setSelectedProposedImageUrls}
                      proposedDocuments={proposedDocuments}
                      selectedProposedDocumentUrls={selectedProposedDocumentUrls}
                      onSelectedDocumentsChange={setSelectedProposedDocumentUrls}
                      canApply={canApplyEnrichment}
                      applying={applyingEnrichment}
                      onApply={applySelectedChanges}
                      onDiscard={discardSuggestions}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="odoo" forceMount className="mt-4 space-y-6">
                  <OdooFields register={register} />
                </TabsContent>

                <TabsContent value="odoo" forceMount className="mt-4 space-y-6">
                  <OdooExtraJsonField
                    value={odooFieldsJson}
                    onChange={setOdooFieldsJson}
                    error={odooFieldsError}
                    placeholder='{"default_code":"SKU123","name":"Product","list_price":120.0}'
                  />
                </TabsContent>

                <TabsContent value="media" className="mt-4 space-y-6">
                  <QueuedMediaPreview
                    pendingImages={pendingImages}
                    pendingDocuments={pendingDocuments}
                  />
                </TabsContent>

              </Tabs>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => router.push("/products")}
                >
                  Cancel
                </Button>
                <Button type="submit" className="rounded-xl" disabled={saving}>
                  {saving ? "Saving..." : "Create product"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
