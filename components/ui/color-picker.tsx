"use client";

import { useState, useRef, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("#")) return trimmed;
  if (HEX_REGEX.test("#" + trimmed)) return "#" + trimmed;
  if (HEX_REGEX.test(trimmed)) return trimmed;
  return value;
}

interface ColorPickerProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (hex: string) => void;
  placeholder?: string;
  className?: string;
}

export function ColorPicker({
  id,
  label,
  value,
  onChange,
  placeholder = "#000000",
  className,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const displayColor = value && (HEX_REGEX.test(value) || HEX_REGEX.test(value.startsWith("#") ? value : "#" + value))
    ? normalizeHex(value)
    : "#888888";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    const hex = normalizeHex(v);
    if (hex) onChange(hex);
  };

  const handlePickerChange = (hex: string) => {
    onChange(hex);
    setInputValue(hex);
  };

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
      )}
      <div className="flex gap-2 items-center">
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="h-10 w-12 rounded-xl border border-input bg-background shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ backgroundColor: displayColor }}
            aria-label="Pick color"
          />
          {open && (
            <div className="absolute left-0 top-full mt-2 z-50 rounded-xl border border-border bg-background p-2 shadow-lg">
              <HexColorPicker color={displayColor} onChange={handlePickerChange} />
            </div>
          )}
        </div>
        <Input
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="rounded-xl flex-1 font-mono text-sm"
        />
      </div>
    </div>
  );
}
