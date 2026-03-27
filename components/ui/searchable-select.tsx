"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  keywords?: string[];
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsLabel?: string;
  value?: string;
  defaultValue?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const SearchableSelect = React.forwardRef<HTMLInputElement, SearchableSelectProps>(
  (
    {
      options,
      placeholder = "Select option",
      searchPlaceholder = "Search...",
      noResultsLabel = "No options found",
      value,
      defaultValue,
      className,
      id,
      onChange,
      name,
      disabled,
      required,
      onBlur,
    },
    ref
  ) => {
    const hiddenInputRef = React.useRef<HTMLInputElement | null>(null);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [internalValue, setInternalValue] = React.useState(
      typeof defaultValue === "string" ? defaultValue : ""
    );
    const isControlled = typeof value === "string";
    const currentValue = isControlled ? value : internalValue;

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

    const visibleOptions = React.useMemo(() => {
      if (!currentValue) {
        return filteredOptions;
      }
      const selectedOption = options.find((option) => option.value === currentValue);
      if (!selectedOption) {
        return filteredOptions;
      }
      if (filteredOptions.some((option) => option.value === currentValue)) {
        return filteredOptions;
      }
      return [selectedOption, ...filteredOptions];
    }, [currentValue, filteredOptions, options]);

    const selectedLabel = React.useMemo(() => {
      if (!currentValue) return placeholder;
      return options.find((option) => option.value === currentValue)?.label ?? placeholder;
    }, [currentValue, options, placeholder]);

    React.useEffect(() => {
      if (isControlled) return;
      const domValue = hiddenInputRef.current?.value ?? "";
      if (domValue !== internalValue) {
        setInternalValue(domValue);
      }
    });

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (!containerRef.current) return;
        if (containerRef.current.contains(event.target as Node)) return;
        setOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (nextValue: string) => {
      if (!isControlled) {
        setInternalValue(nextValue);
      }
      if (onChange) {
        onChange({
          target: { value: nextValue, name },
          currentTarget: { value: nextValue, name },
        } as React.ChangeEvent<HTMLInputElement>);
      }
      setOpen(false);
      setSearch("");
    };

    const setRefs = (node: HTMLInputElement | null) => {
      hiddenInputRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-2xl border border-border bg-background px-4 py-2 text-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          onClick={() => setOpen((prev) => !prev)}
          disabled={disabled}
        >
          <span className={cn("truncate text-left", !currentValue && "text-muted-foreground")}>
            {selectedLabel}
          </span>
          <ChevronDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
        </button>

        {open ? (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-background p-2 shadow-lg">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="mb-2 rounded-xl"
              autoFocus
            />
            <div className="max-h-56 overflow-auto rounded-lg border border-border/60">
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted",
                  currentValue === "" && "bg-muted"
                )}
                onClick={() => handleSelect("")}
              >
                <span>{placeholder}</span>
                {currentValue === "" ? <Check className="size-4" /> : null}
              </button>
              {visibleOptions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">{noResultsLabel}</p>
              ) : (
                visibleOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted",
                      currentValue === option.value && "bg-muted"
                    )}
                    onClick={() => handleSelect(option.value)}
                  >
                    <span>{option.label}</span>
                    {currentValue === option.value ? <Check className="size-4" /> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}

        <input
          ref={setRefs}
          type="hidden"
          id={id}
          name={name}
          value={currentValue}
          onBlur={onBlur}
          readOnly
          required={required}
        />
        <div className="sr-only">
          {/* keep semantics for form libraries expecting an input node */}
        </div>
      </div>
    );
  }
);

SearchableSelect.displayName = "SearchableSelect";

export { SearchableSelect };
