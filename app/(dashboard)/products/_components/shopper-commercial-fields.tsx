import type { UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const numericSetValueAs = (v: string | null | undefined) =>
  v === "" || v == null ? undefined : Number(v);

interface ShopperCommercialFieldsProps {
  register: UseFormRegister<any>;
  derivedPricePerUnit?: number | null;
  storeAvailability?: "IN_STOCK" | "LIMITED" | "OUT_OF_STOCK" | null;
  technicalSpecsJson: string;
  onTechnicalSpecsChange: (value: string) => void;
  technicalSpecsError?: string | null;
}

export function ShopperCommercialFields({
  register,
  derivedPricePerUnit,
  storeAvailability,
  technicalSpecsJson,
  onTechnicalSpecsChange,
  technicalSpecsError,
}: ShopperCommercialFieldsProps) {
  const derivedPreviewNum =
    derivedPricePerUnit == null
      ? NaN
      : typeof derivedPricePerUnit === "number"
        ? derivedPricePerUnit
        : Number(derivedPricePerUnit);
  const showDerivedPreview = Number.isFinite(derivedPreviewNum);

  const availabilityLabel =
    storeAvailability === "IN_STOCK"
      ? "In stock"
      : storeAvailability === "LIMITED"
        ? "Limited"
        : storeAvailability === "OUT_OF_STOCK"
          ? "Out of stock"
          : "Not available";

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 p-4">
      <h3 className="text-sm font-semibold">Commercial and fulfillment fields</h3>
      <p className="text-xs text-muted-foreground">
        Commercial values are sourced from Odoo and are read-only here.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label className="block text-sm font-medium mb-1">Base unit</label>
          <Input className="rounded-xl" readOnly {...register("baseUnit")} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Content amount</label>
          <Input
            type="number"
            step="any"
            className="rounded-xl"
            readOnly
            {...register("contentAmount", { setValueAs: numericSetValueAs })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Pack size</label>
          <Input
            type="number"
            className="rounded-xl"
            readOnly
            {...register("packSize", { setValueAs: numericSetValueAs })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Price per unit</label>
          <Input
            type="number"
            step="any"
            className="rounded-xl"
            readOnly
            {...register("pricePerUnit", { setValueAs: numericSetValueAs })}
          />
          {showDerivedPreview && (
            <p className="mt-1 text-xs text-muted-foreground">
              Derived preview from list price: {derivedPreviewNum.toFixed(4)}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Store availability</label>
          <Input className="rounded-xl" readOnly value={availabilityLabel} />
          <p className="mt-1 text-xs text-muted-foreground">Derived from inventory stock and reservations.</p>
        </div>
        <div className="flex items-center gap-2 pt-7">
          <Input type="checkbox" className="h-4 w-4 rounded" {...register("clickCollectEligible")} />
          <label className="text-sm font-medium">Click and collect eligible</label>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium">Technical specs (JSON)</label>
          <p className="text-xs text-muted-foreground mt-1">
            Shopper-facing structured specs. Odoo details are merged automatically on save.
          </p>
        </div>
        <Textarea
          className="rounded-xl font-mono text-xs"
          rows={12}
          value={technicalSpecsJson}
          onChange={(event) => onTechnicalSpecsChange(event.target.value)}
        />
        {technicalSpecsError ? <p className="text-xs text-red-500">{technicalSpecsError}</p> : null}
      </div>
    </div>
  );
}
