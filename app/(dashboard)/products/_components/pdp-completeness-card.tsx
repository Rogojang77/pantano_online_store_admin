import type { ProductPdpCompleteness } from "@/services/products.service";

interface PdpCompletenessCardProps {
  completeness?: ProductPdpCompleteness | null;
}

export function PdpCompletenessCard({ completeness }: PdpCompletenessCardProps) {
  if (!completeness) return null;

  const scoreTone =
    completeness.score >= 85 ? "text-green-600" : completeness.score >= 70 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">PDP completeness</h3>
        <span className={`text-sm font-semibold ${scoreTone}`}>{completeness.score}%</span>
      </div>

      <ul className="space-y-1 text-xs text-muted-foreground">
        {completeness.checklist.map((item) => (
          <li key={item.key}>
            {item.complete ? "✓" : "•"} {item.label}
            {!item.complete && item.missing.length > 0 ? `: ${item.missing.join(", ")}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
