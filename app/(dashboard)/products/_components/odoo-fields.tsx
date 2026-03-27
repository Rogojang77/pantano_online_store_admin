import type { UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

const numericSetValueAs = (v: string | null | undefined) =>
  v === "" || v == null ? undefined : Number(v);

interface SellerLookupInfo {
  sellerIds: number[];
  variantSellerIds: number[];
  sellerNameLookup: Record<number, string>;
  loading: boolean;
}

interface OdooFieldsProps {
  register: UseFormRegister<any>;
  sellerLookup?: SellerLookupInfo;
}

export function OdooFields({ register, sellerLookup }: OdooFieldsProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 p-4">
      <h3 className="text-sm font-semibold">Odoo product fields</h3>
      <p className="text-xs text-muted-foreground">
        Core fields for Odoo sync are shown below. Use advanced fields only when needed.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium mb-1">Odoo name</label>
          <Input className="rounded-xl" {...register("odoo.name")} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Default code</label>
          <Input className="rounded-xl" {...register("odoo.defaultCode")} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Detailed type</label>
          <Select className="rounded-2xl" {...register("odoo.detailedType")}>
            <option value="product">product</option>
            <option value="consu">consu</option>
            <option value="service">service</option>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Sale ok</label>
          <Select className="rounded-2xl" {...register("odoo.saleOk")}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Purchase ok</label>
          <Select className="rounded-2xl" {...register("odoo.purchaseOk")}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">List price</label>
          <Input
            type="number"
            step="any"
            className="rounded-xl"
            {...register("odoo.listPrice", { setValueAs: numericSetValueAs })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Standard price</label>
          <Input
            type="number"
            step="any"
            className="rounded-xl"
            {...register("odoo.standardPrice", { setValueAs: numericSetValueAs })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium mb-1">Odoo category ID</label>
          <Input
            type="number"
            className="rounded-xl"
            {...register("odoo.categoryId", { setValueAs: numericSetValueAs })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">UoM ID</label>
          <Input
            type="number"
            className="rounded-xl"
            {...register("odoo.uomId", { setValueAs: numericSetValueAs })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Purchase UoM ID</label>
          <Input
            type="number"
            className="rounded-xl"
            {...register("odoo.purchaseUomId", { setValueAs: numericSetValueAs })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Sellers IDs</label>
          <Input className="rounded-xl" {...register("odoo.sellersCsv")} />
          {sellerLookup && (
            <p className="mt-1 text-xs text-muted-foreground">
              {sellerLookup.loading
                ? "Resolving sellers..."
                : sellerLookup.sellerIds.length
                  ? sellerLookup.sellerIds
                      .map((id) => `${id} -> ${sellerLookup.sellerNameLookup[id] ?? "name unavailable"}`)
                      .join(" | ")
                  : "No seller IDs"}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Variant sellers IDs</label>
          <Input className="rounded-xl" {...register("odoo.variantSellersCsv")} />
          {sellerLookup && (
            <p className="mt-1 text-xs text-muted-foreground">
              {sellerLookup.loading
                ? "Resolving variant sellers..."
                : sellerLookup.variantSellerIds.length
                  ? sellerLookup.variantSellerIds
                      .map((id) => `${id} -> ${sellerLookup.sellerNameLookup[id] ?? "name unavailable"}`)
                      .join(" | ")
                  : "No variant seller IDs"}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description sale</label>
        <Textarea rows={3} className="rounded-xl resize-y" {...register("odoo.descriptionSale")} />
      </div>

      <details className="rounded-xl border border-border/60 bg-muted/10 p-3">
        <summary className="cursor-pointer text-sm font-medium">Advanced Odoo fields</summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Optional fields for less common sync requirements.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <Select className="rounded-2xl" {...register("odoo.type")}>
              <option value="product">product</option>
              <option value="consu">consu</option>
              <option value="service">service</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Active</label>
            <Select className="rounded-2xl" {...register("odoo.active")}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Odoo weight</label>
            <Input
              type="number"
              step="any"
              className="rounded-xl"
              {...register("odoo.odooWeight", { setValueAs: numericSetValueAs })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Volume</label>
            <Input
              type="number"
              step="any"
              className="rounded-xl"
              {...register("odoo.volume", { setValueAs: numericSetValueAs })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Taxes IDs (comma-separated)</label>
            <Input className="rounded-xl" {...register("odoo.taxesCsv")} placeholder="63, 70" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Supplier taxes IDs</label>
            <Input className="rounded-xl" {...register("odoo.supplierTaxesCsv")} placeholder="67" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tags IDs</label>
            <Input className="rounded-xl" {...register("odoo.tagsCsv")} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">POS categories IDs</label>
            <Input className="rounded-xl" {...register("odoo.posCategoriesCsv")} />
          </div>
        </div>
      </details>
    </div>
  );
}
