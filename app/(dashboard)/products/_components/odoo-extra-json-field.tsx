import { Textarea } from "@/components/ui/textarea";

interface OdooExtraJsonFieldProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  placeholder?: string;
}

export function OdooExtraJsonField({ value, onChange, error, placeholder }: OdooExtraJsonFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">Additional Odoo fields (JSON)</label>
      <p className="mb-2 text-xs text-muted-foreground">
        Optional extra keys to merge into <span className="font-mono">technicalSpecs.odoo.productDetail</span>.
      </p>
      <Textarea
        rows={12}
        className="rounded-xl font-mono text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
