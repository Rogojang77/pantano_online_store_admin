import type { UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";

interface SeoMetaFieldsProps {
  register: UseFormRegister<any>;
}

export function SeoMetaFields({ register }: SeoMetaFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">Meta title</label>
        <Input className="rounded-xl" {...register("metaTitle")} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Meta description</label>
        <Input className="rounded-xl" {...register("metaDescription")} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Meta keywords</label>
        <Input className="rounded-xl" {...register("metaKeywords")} />
      </div>
    </div>
  );
}
