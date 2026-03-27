import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ProductAttributeInputItem, ProductAttributeRequirementItem } from "@/services/products.service";

interface RequiredAttributesPanelProps {
  requirements: ProductAttributeRequirementItem[];
  values: ProductAttributeInputItem[];
  onChange: (next: ProductAttributeInputItem[]) => void;
}

function resolveAttributeValue(
  values: ProductAttributeInputItem[],
  definitionId: string
): ProductAttributeInputItem | undefined {
  return values.find((item) => item.definitionId === definitionId);
}

export function RequiredAttributesPanel({ requirements, values, onChange }: RequiredAttributesPanelProps) {
  if (requirements.length === 0) {
    return null;
  }

  const handleValueChange = (
    definitionId: string,
    next: { valueId?: string; valueText?: string }
  ) => {
    const current = values.filter((item) => item.definitionId !== definitionId);
    const hasValue = Boolean(next.valueId || next.valueText?.trim());
    if (!hasValue) {
      onChange(current);
      return;
    }
    onChange([
      ...current,
      {
        definitionId,
        valueId: next.valueId || undefined,
        valueText: next.valueText?.trim() || undefined,
      },
    ]);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 p-4">
      <h3 className="text-sm font-semibold">Product attributes</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requirements.map((requirement) => {
          const selected = resolveAttributeValue(values, requirement.definitionId);
          const hasPredefinedValues = requirement.definition.values.length > 0;
          const label = requirement.definition.unit
            ? `${requirement.definition.name} (${requirement.definition.unit})`
            : requirement.definition.name;

          return (
            <div key={requirement.definitionId}>
              <label className="block text-sm font-medium mb-1">
                {label}
                {requirement.isRequired || requirement.definition.isRequired ? " *" : ""}
              </label>
              {hasPredefinedValues ? (
                <Select
                  className="rounded-2xl"
                  value={selected?.valueId ?? ""}
                  onChange={(event) =>
                    handleValueChange(requirement.definitionId, { valueId: event.target.value || undefined })
                  }
                >
                  <option value="">Select value</option>
                  {requirement.definition.values.map((value) => (
                    <option key={value.id} value={value.id}>
                      {value.value}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  className="rounded-xl"
                  value={selected?.valueText ?? ""}
                  onChange={(event) =>
                    handleValueChange(requirement.definitionId, { valueText: event.target.value })
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
