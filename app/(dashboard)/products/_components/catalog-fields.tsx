import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { CategoryItem } from "@/services/categories.service";
import type { BrandItem } from "@/services/brands.service";

interface CatalogFieldsProps {
  register: UseFormRegister<any>;
  categories: CategoryItem[];
  brands: BrandItem[];
  errors?: FieldErrors;
  slugLabel?: string;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

export function CatalogFields({ register, categories, brands, errors, slugLabel = "Slug" }: CatalogFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <Input className="rounded-xl" {...register("name", { required: true })} />
          <FieldError message={errors?.name?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">SKU</label>
          <Input className="rounded-xl" {...register("sku", { required: true })} />
          <FieldError message={errors?.sku?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{slugLabel}</label>
          <Input className="rounded-xl" {...register("slug")} />
          <FieldError message={errors?.slug?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <Select className="rounded-2xl" {...register("status")}>
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <SearchableSelect
            className="rounded-2xl"
            options={categories.map((c) => ({
              value: c.id,
              label: c.name,
              keywords: [c.normalizedName ?? "", c.slug ?? ""],
            }))}
            placeholder="Select category"
            searchPlaceholder="Search categories..."
            {...register("categoryId")}
          />
          <FieldError message={errors?.categoryId?.message as string} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Brand</label>
          <SearchableSelect
            className="rounded-2xl"
            options={brands.map((brand) => ({
              value: brand.id,
              label: brand.name,
              keywords: [brand.slug],
            }))}
            placeholder="Select brand"
            searchPlaceholder="Search brands..."
            {...register("brandId")}
          />
          <FieldError message={errors?.brandId?.message as string} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <Textarea rows={4} className="rounded-xl resize-y" {...register("description")} />
      </div>
    </>
  );
}
