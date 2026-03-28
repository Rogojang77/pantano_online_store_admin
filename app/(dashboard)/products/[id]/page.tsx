"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  productsService,
  type ProductAttributeInputItem,
  type UpdateProductPayload,
} from "@/services/products.service";
import { geminiEnrichmentService } from "@/services/gemini-enrichment.service";
import { icecatService } from "@/services/icecat.service";
import { odooService } from "@/services/odoo.service";
import {
  type EnrichmentDiffItem,
  type EnrichmentImageItem,
  type ProposedDocumentItem,
} from "@/lib/enrichment-diff";
import { buildGeminiPreviewState } from "@/lib/gemini-enrichment-preview";
import {
  extractOdooFormValues,
} from "@/lib/odoo-product-form";
import { normalizeLookupValue } from "@/lib/string-utils";
import { updateProductSchema, type UpdateProductFormValues } from "@/lib/validation/product-form.schema";
import { mapApiErrorToForm } from "@/lib/validation/api-error";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { CatalogFields } from "../_components/catalog-fields";
import { ShopperCommercialFields } from "../_components/shopper-commercial-fields";
import { RequiredAttributesPanel } from "../_components/required-attributes-panel";
import { PdpCompletenessCard } from "../_components/pdp-completeness-card";
import { SeoMetaFields } from "../_components/seo-meta-fields";
import { OdooFields } from "../_components/odoo-fields";
import { OdooExtraJsonField } from "../_components/odoo-extra-json-field";
import { EnrichmentReviewPanel } from "../_components/enrichment-review-panel";
import { ProductImageManager } from "../_components/product-image-manager";
import { ProductDocumentsList } from "../_components/product-documents-list";
import { VariantsSection } from "../_components/variants-section";
import { useOdooExtraJson } from "../_hooks/use-odoo-extra-json";
import {
  useProductDetail,
  useInvalidateProduct,
  useCategoriesQuery,
  useBrandsQuery,
  useEffectiveCategoryAttributesQuery,
} from "../_hooks/use-product-queries";
import { resolveNoBrandId } from "../_lib/no-brand";

type FormValues = UpdateProductFormValues;
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

export default function ProductEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const { data: product, isLoading: productLoading, error: productError } = useProductDetail(id);
  const { data: categories = [], isLoading: categoriesLoading } = useCategoriesQuery(
    product?.categoryId ?? undefined,
  );
  const { data: brands = [], isLoading: brandsLoading } = useBrandsQuery();
  const lookupsLoading = categoriesLoading || brandsLoading;
  const {
    odooFieldsJson, setOdooFieldsJson,
    odooFieldsError, setOdooFieldsError,
    resetJson,
  } = useOdooExtraJson();

  const invalidateProduct = useInvalidateProduct(id ?? "");

  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [applyingEnrichment, setApplyingEnrichment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register, handleSubmit, reset, getValues, setValue, watch,
    setError: setFormError,
    formState: { errors: formErrors },
  } = useForm<FormValues>({
    resolver: zodResolver(updateProductSchema),
  });

  const [diffItems, setDiffItems] = useState<EnrichmentDiffItem[]>([]);
  const [fieldSelection, setFieldSelection] = useState<Record<string, boolean> | null>(null);
  const [mappedPreview, setMappedPreview] = useState<Record<string, unknown> | null>(null);
  const [dynamicPreview, setDynamicPreview] = useState<Record<string, unknown> | null>(null);
  const [proposedImages, setProposedImages] = useState<EnrichmentImageItem[]>([]);
  const [selectedProposedImageUrls, setSelectedProposedImageUrls] = useState<string[]>([]);
  const [proposedDocuments, setProposedDocuments] = useState<ProposedDocumentItem[]>([]);
  const [selectedProposedDocumentUrls, setSelectedProposedDocumentUrls] = useState<string[]>([]);
  const [pendingIcecatTechnicalSpecs, setPendingIcecatTechnicalSpecs] = useState<Record<string, unknown> | null>(null);
  const [pendingGeminiMappedFields, setPendingGeminiMappedFields] = useState<Record<string, unknown> | null>(null);
  const [imageAltDrafts, setImageAltDrafts] = useState<Record<string, string>>({});
  const [imageSavingId, setImageSavingId] = useState<string | null>(null);
  const [imageDeletingId, setImageDeletingId] = useState<string | null>(null);
  const [selectedProductAttributes, setSelectedProductAttributes] = useState<ProductAttributeInputItem[]>([]);
  const [technicalSpecsDraft, setTechnicalSpecsDraft] = useState("{}");
  const [technicalSpecsError, setTechnicalSpecsError] = useState<string | null>(null);
  const [sellerNameLookup, setSellerNameLookup] = useState<Record<number, string>>({});
  const [sellerLookupLoading, setSellerLookupLoading] = useState(false);

  const getCategoryNameById = (categoryId: string | null | undefined): string => {
    if (!categoryId) return "";
    return categories.find((item) => item.id === categoryId)?.name ?? "";
  };

  const getBrandNameById = (brandId: string | null | undefined): string => {
    if (!brandId) return "";
    return brands.find((item) => item.id === brandId)?.name ?? "";
  };

  const parseOdooIdsCsv = (value: string | undefined): number[] => {
    if (!value) return [];
    return Array.from(new Set(
      value.split(",").map((part) => Number(part.trim())).filter((n) => Number.isInteger(n) && n > 0),
    ));
  };

  const sellersCsvValue = watch("odoo.sellersCsv");
  const variantSellersCsvValue = watch("odoo.variantSellersCsv");
  const watchedCategoryId = watch("categoryId");
  const watchedContentAmount = watch("contentAmount");
  const watchedExplicitPricePerUnit = watch("pricePerUnit");
  const watchedListPrice = watch("odoo.listPrice");
  const watchedStoreAvailability = watch("storeAvailability");
  const watchedStatus = watch("status");
  const sellerIds = parseOdooIdsCsv(sellersCsvValue);
  const variantSellerIds = parseOdooIdsCsv(variantSellersCsvValue);
  const { data: effectiveAttributes = [] } = useEffectiveCategoryAttributesQuery(watchedCategoryId);

  useEffect(() => {
    if (!product) return;
    setImageAltDrafts(
      Object.fromEntries((product.images ?? []).map((img) => [img.id, img.alt ?? ""])),
    );
    const technicalSpecs = product.technicalSpecs && typeof product.technicalSpecs === "object"
      ? (product.technicalSpecs as Record<string, unknown>)
      : {};
    const { odoo: _legacyOdooSpecs, ...shopperTechnicalSpecs } = technicalSpecs;
    const extracted = extractOdooFormValues({});
    setTechnicalSpecsDraft(JSON.stringify(shopperTechnicalSpecs, null, 2));
    setTechnicalSpecsError(null);
    resetJson();
    reset({
      ean: product.ean ?? undefined,
      sku: product.sku ?? undefined,
      name: product.name,
      slug: product.slug,
      description: product.description,
      baseUnit: product.baseUnit ?? undefined,
      contentAmount: product.contentAmount ?? undefined,
      pricePerUnit: product.pricePerUnit ?? undefined,
      packSize: product.packSize ?? undefined,
      storeAvailability: product.storeAvailability ?? undefined,
      clickCollectEligible: product.clickCollectEligible ?? undefined,
      categoryId: product.categoryId ?? undefined,
      brandId: product.brandId ?? undefined,
      status: product.status as FormValues["status"],
      metaTitle: product.metaTitle ?? undefined,
      metaDescription: product.metaDescription ?? undefined,
      metaKeywords: product.metaKeywords ?? undefined,
      odoo: extracted,
    });
    setSelectedProductAttributes(product.productAttributes ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, reset]);

  const [sellerLookupStable, setSellerLookupStable] = useState("");
  useEffect(() => {
    const raw = [sellersCsvValue ?? "", variantSellersCsvValue ?? ""].join("|");
    const timer = window.setTimeout(() => setSellerLookupStable(raw), 1500);
    return () => window.clearTimeout(timer);
  }, [sellersCsvValue, variantSellersCsvValue]);

  useEffect(() => {
    const [sellers, variantSellers] = sellerLookupStable.split("|");
    const lookupIds = Array.from(new Set([
      ...parseOdooIdsCsv(sellers),
      ...parseOdooIdsCsv(variantSellers),
    ]));
    if (!lookupIds.length) {
      setSellerNameLookup({});
      setSellerLookupLoading(false);
      return;
    }

    let cancelled = false;
    setSellerLookupLoading(true);
    odooService.getSupplierNamesByOdooIds(lookupIds)
      .then((names) => { if (!cancelled) setSellerNameLookup(names); })
      .catch(() => { if (!cancelled) setSellerNameLookup({}); })
      .finally(() => { if (!cancelled) setSellerLookupLoading(false); });

    return () => { cancelled = true; };
  }, [sellerLookupStable]);


  const handleEnrich = async () => {
    if (!id) return;
    setEnriching(true);
    try {
      const preview = await geminiEnrichmentService.preview(id);
      const hasMappedFields = !!preview.mappedFields && Object.keys(preview.mappedFields).length > 0;
      const hasDynamicFields = !!preview.dynamicFields && Object.keys(preview.dynamicFields).length > 0;
      if (hasMappedFields || hasDynamicFields) {
        const current = getValues();
        const previewState = buildGeminiPreviewState({
          current: {
            name: current.name,
            slug: current.slug,
            description: current.description,
            metaTitle: current.metaTitle,
            metaDescription: current.metaDescription,
            metaKeywords: current.metaKeywords,
            technicalSpecs:
              pendingIcecatTechnicalSpecs ??
              (product?.technicalSpecs && typeof product.technicalSpecs === "object"
                ? (product.technicalSpecs as Record<string, unknown>)
                : null),
            suggestedCategoryName: getCategoryNameById(current.categoryId),
            suggestedBrandName: getBrandNameById(current.brandId),
            geminiMappedFields: pendingGeminiMappedFields ?? product?.geminiMappedFields ?? null,
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
        clearEnrichmentState();
        toast.error(preview.geminiResult.error || "Gemini returned no enrichment suggestions");
      }
    } catch {
      clearEnrichmentState();
      toast.error("Failed to preview enrichment from Gemini");
    } finally {
      setEnriching(false);
    }
  };

  const clearEnrichmentState = () => {
    setDiffItems([]);
    setFieldSelection(null);
    setMappedPreview(null);
    setDynamicPreview(null);
    setProposedImages([]);
    setSelectedProposedImageUrls([]);
    setProposedDocuments([]);
    setSelectedProposedDocumentUrls([]);
    setPendingIcecatTechnicalSpecs(null);
    setPendingGeminiMappedFields(null);
    setTechnicalSpecsError(null);
  };

  const applySelectedChanges = async () => {
    if (!fieldSelection || applyingEnrichment) return;
    if (!mappedPreview && !dynamicPreview) return;

    setApplyingEnrichment(true);
    try {
      let changed = 0;
      let shouldRefresh = false;

      if (mappedPreview && fieldSelection.technicalSpecs) {
        setPendingIcecatTechnicalSpecs(
          mappedPreview.technicalSpecs && typeof mappedPreview.technicalSpecs === "object"
            ? (mappedPreview.technicalSpecs as Record<string, unknown>)
            : null,
        );
        if (mappedPreview.technicalSpecs && typeof mappedPreview.technicalSpecs === "object") {
          const { odoo: _mappedLegacyOdoo, ...mappedShopperSpecs } =
            mappedPreview.technicalSpecs as Record<string, unknown>;
          setTechnicalSpecsDraft(JSON.stringify(mappedShopperSpecs, null, 2));
          setTechnicalSpecsError(null);
          changed += 1;
        }
      }

      const textMapping: Array<
        "name" | "slug" | "description" | "metaTitle" | "metaDescription" | "metaKeywords"
      > = [
        "name",
        "slug",
        "description",
        "metaTitle",
        "metaDescription",
        "metaKeywords",
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
          const baseDynamic =
            pendingGeminiMappedFields ??
            (product?.geminiMappedFields && typeof product.geminiMappedFields === "object"
              ? (product.geminiMappedFields as Record<string, unknown>)
              : {});
          const nextDynamic: Record<string, unknown> = { ...baseDynamic };
          for (const dynamicPath of selectedDynamicPaths) {
            const dynamicValue = getValueByPath(dynamicPreview, dynamicPath);
            if (dynamicValue === undefined) continue;
            setValueByPath(nextDynamic, dynamicPath, dynamicValue);
          }
          setPendingGeminiMappedFields(nextDynamic);
          changed += selectedDynamicPaths.length;
        }
      }

      const selectedImages = proposedImages.filter((img) => selectedProposedImageUrls.includes(img.url));
      if (selectedImages.length > 0 && id) {
        try {
          const result = await icecatService.downloadImages({
            productId: id,
            images: selectedImages.map((img) => ({ url: img.url, alt: img.alt })),
          });
          changed += result.downloaded;
          shouldRefresh = shouldRefresh || result.downloaded > 0;
          if (result.failed > 0) {
            toast.warning(`${result.downloaded} images saved, ${result.failed} failed to download`);
          }
        } catch {
          toast.error("Failed to download and save images");
        }
      }

      const selectedDocs = proposedDocuments.filter((doc) => selectedProposedDocumentUrls.includes(doc.url));
      if (selectedDocs.length > 0 && id) {
        try {
          const result = await icecatService.downloadDocuments({
            productId: id,
            documents: selectedDocs,
          });
          changed += result.downloaded;
          shouldRefresh = shouldRefresh || result.downloaded > 0;
          if (result.failed > 0) {
            toast.warning(`${result.downloaded} documents saved, ${result.failed} failed to download`);
          }
        } catch {
          toast.error("Failed to download and save documents");
        }
      }

      if (shouldRefresh) invalidateProduct();
      toast.success(changed > 0 ? `${changed} field(s)/image(s)/document(s) applied` : "No fields selected");
    } finally {
      setApplyingEnrichment(false);
    }
  };

  const changedFieldsSelectedCount = fieldSelection
    ? diffItems.filter((item) => item.changed && fieldSelection[item.path]).length
    : 0;
  const canApplyEnrichment =
    changedFieldsSelectedCount > 0 ||
    selectedProposedImageUrls.length > 0 ||
    selectedProposedDocumentUrls.length > 0;
  const toFiniteNumber = (v: unknown): number | null => {
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const explicitPpu = toFiniteNumber(watchedExplicitPricePerUnit);
  const listPriceNum = toFiniteNumber(watchedListPrice);
  const contentAmountNum = toFiniteNumber(watchedContentAmount);
  const derivedPricePerUnit =
    explicitPpu ??
    (listPriceNum != null &&
    contentAmountNum != null &&
    contentAmountNum > 0
      ? listPriceNum / contentAmountNum
      : null);

  const handleSaveImageAlt = async (imageId: string) => {
    if (!id) return;
    const alt = imageAltDrafts[imageId] ?? "";
    setImageSavingId(imageId);
    try {
      await productsService.updateImage(id, imageId, { alt });
      toast.success("Image updated");
      invalidateProduct();
    } catch {
      toast.error("Failed to update image");
    } finally {
      setImageSavingId(null);
    }
  };

  const handleSetPrimaryImage = async (imageId: string) => {
    if (!id) return;
    setImageSavingId(imageId);
    try {
      await productsService.updateImage(id, imageId, { isPrimary: true });
      toast.success("Primary image updated");
      invalidateProduct();
    } catch {
      toast.error("Failed to set primary image");
    } finally {
      setImageSavingId(null);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!id) return;
    setImageDeletingId(imageId);
    try {
      await productsService.deleteImage(id, imageId);
      toast.success("Image deleted");
      invalidateProduct();
    } catch {
      toast.error("Failed to delete image");
    } finally {
      setImageDeletingId(null);
    }
  };


  const onSubmit = async (values: FormValues) => {
    if (!id) return;
    setSaving(true);
    setError(null);
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

      const baseSpecsFromPreview =
        pendingIcecatTechnicalSpecs && typeof pendingIcecatTechnicalSpecs === "object"
          ? (pendingIcecatTechnicalSpecs as Record<string, unknown>)
          : null;
      const existingSpecs =
        baseSpecsFromPreview ??
        (product?.technicalSpecs && typeof product.technicalSpecs === "object"
          ? (product.technicalSpecs as Record<string, unknown>)
          : {});
      const { odoo: _ignoredOdooValues, ...productValues } = values;
      const existingGeminiMappedFields =
        pendingGeminiMappedFields ??
        (product?.geminiMappedFields && typeof product.geminiMappedFields === "object"
          ? (product.geminiMappedFields as Record<string, unknown>)
          : null);
      const nextTechnicalSpecsSource =
        Object.keys(parsedTechnicalSpecs).length > 0 ? parsedTechnicalSpecs : existingSpecs;
      const { odoo: _ignoredOdooSpecs, ...shopperTechnicalSpecs } = nextTechnicalSpecsSource;

      const payload: UpdateProductPayload = {
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
        geminiMappedFields: existingGeminiMappedFields ?? undefined,
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

      await productsService.update(id, payload);
      router.push("/products");
    } catch (err) {
      setError(mapApiErrorToForm(err, setFormError));
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return <p className="text-sm text-red-500">Missing product ID in URL.</p>;
  }

  const loading = productLoading;
  const isPageLoading = loading || lookupsLoading;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit product</h1>
          <p className="text-muted-foreground mt-1">
            Product ID: <span className="font-mono text-xs">{id}</span>
          </p>
          {product?.odooSync && (
            <p className="text-xs text-muted-foreground mt-1">
              Odoo ID: {product.odooSync.odooProductId ?? "not linked"} &middot; Last sync:{" "}
              {product.odooSync.lastSyncedAt
                ? new Date(product.odooSync.lastSyncedAt).toLocaleString()
                : "never"}
            </p>
          )}
        </div>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle>Product details</CardTitle>
        </CardHeader>
        <CardContent>
          {isPageLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {(error || productError) && (
                <p className="text-sm text-red-500">
                  {error || "Failed to load product."}
                </p>
              )}
              {watchedStatus === "ACTIVE" && product?.pdpCompleteness?.blockers?.length ? (
                <p className="text-sm text-amber-600">
                  Publish gate warnings: {product.pdpCompleteness.blockers.join(", ")}
                </p>
              ) : null}
              <PdpCompletenessCard completeness={product?.pdpCompleteness} />

              <Tabs defaultValue="catalog" className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 rounded-xl">
                  <TabsTrigger value="catalog" type="button" className="rounded-lg">
                    Catalog
                  </TabsTrigger>
                  <TabsTrigger value="odoo" type="button" className="rounded-lg">
                    Odoo
                  </TabsTrigger>
                  <TabsTrigger value="media" type="button" className="rounded-lg">
                    Media
                  </TabsTrigger>
                  <TabsTrigger value="variants" type="button" className="rounded-lg">
                    Variants
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="catalog" forceMount className="mt-4 space-y-6">
                  <CatalogFields register={register} categories={categories} brands={brands} errors={formErrors} />
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
                        disabled={enriching || isPageLoading}
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
                      onDiscard={clearEnrichmentState}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="media" className="mt-4 space-y-6">
                  <ProductImageManager
                    images={product?.images ?? []}
                    imageAltDrafts={imageAltDrafts}
                    onAltChange={(imgId, value) =>
                      setImageAltDrafts((prev) => ({ ...prev, [imgId]: value }))
                    }
                    onSaveAlt={handleSaveImageAlt}
                    onSetPrimary={handleSetPrimaryImage}
                    onDelete={handleDeleteImage}
                    savingId={imageSavingId}
                    deletingId={imageDeletingId}
                  />
                  <ProductDocumentsList
                    documents={product?.documents ?? []}
                    requiredTypes={product?.pdpCompleteness?.requiredDocumentTypes ?? []}
                    missingRequiredTypes={product?.pdpCompleteness?.missingRequiredDocumentTypes ?? []}
                  />
                </TabsContent>

                <TabsContent value="odoo" forceMount className="mt-4 space-y-6">
                  <OdooFields
                    register={register}
                    sellerLookup={{
                      sellerIds,
                      variantSellerIds,
                      sellerNameLookup,
                      loading: sellerLookupLoading,
                    }}
                  />
                </TabsContent>

                <TabsContent value="odoo" forceMount className="mt-4 space-y-6">
                  <OdooExtraJsonField
                    value={odooFieldsJson}
                    onChange={setOdooFieldsJson}
                    error={odooFieldsError}
                  />
                </TabsContent>

                <TabsContent value="variants" className="mt-4">
                  <VariantsSection
                    productId={id}
                    variants={product?.variants ?? []}
                    onVariantsChanged={invalidateProduct}
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
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
