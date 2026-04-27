"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SearchableSelectOption } from "./searchable-select";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export interface SearchableMultiSelectProps {
  options: SearchableSelectOption[];
  value: string[];
  onValueChange: (next: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Combobox with search; multiple options via toggle; selected ids shown as removable badges.
 */
export function SearchableMultiSelect({
  options,
  value,
  onValueChange,
  placeholder = "Selectează…",
  searchPlaceholder = "Caută…",
  noResultsLabel = "Nimic găsit",
  disabled,
  className,
}: SearchableMultiSelectProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedSet = React.useMemo(() => new Set(value), [value]);
  const labelByValue = React.useMemo(
    () => new Map(options.map((o) => [o.value, o.label] as const)),
    [options]
  );

  const filteredOptions = React.useMemo(() => {
    const query = normalize(search);
    if (!query) {
      return options;
    }
    return options.filter((option) => {
      const haystack = [option.label, option.value, ...(option.keywords ?? [])]
        .map((token) => normalize(token))
        .join(" ");
      return haystack.includes(query);
    });
  }, [options, search]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onValueChange(value.filter((v) => v !== id));
    } else {
      onValueChange([...value, id]);
    }
  };

  const clearAll = () => onValueChange([]);

  const remove = (id: string) => {
    onValueChange(value.filter((v) => v !== id));
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        role="combobox"
        aria-expanded={open}
        tabIndex={disabled ? -1 : 0}
        className={cn(
          "flex min-h-10 w-full flex-col gap-1 rounded-2xl border border-border bg-background px-3 py-2 text-left text-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer"
        )}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          <div className="flex max-h-24 flex-wrap gap-1.5">
            {value.map((id) => (
              <Badge
                key={id}
                variant="secondary"
                className="max-w-full gap-0.5 rounded-lg py-0.5 pl-2 pr-0.5 text-xs font-normal"
              >
                <span className="truncate">
                  {labelByValue.get(id) ?? id.slice(0, 8)}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded p-0.5 hover:bg-muted-foreground/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(id);
                  }}
                  aria-label={`Elimină ${labelByValue.get(id) ?? id}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{value.length > 0 ? `${value.length} selectate` : ""}</span>
          <ChevronDown className="size-4 shrink-0" />
        </div>
      </div>

      {open ? (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-background p-2 shadow-lg">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="mb-2 rounded-xl"
            autoFocus
            onKeyDown={(e) => e.stopPropagation()}
          />
          {value.length > 0 ? (
            <div className="mb-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-full justify-start text-xs"
                onClick={clearAll}
              >
                Șterge selecția
              </Button>
            </div>
          ) : null}
          <div className="max-h-56 overflow-auto rounded-lg border border-border/60">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">{noResultsLabel}</p>
            ) : (
              filteredOptions.map((option) => {
                const isOn = selectedSet.has(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                      isOn && "bg-muted/80"
                    )}
                    onClick={() => toggle(option.value)}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {isOn ? <Check className="size-4 shrink-0" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
