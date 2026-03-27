"use client";

import { Button } from "@/components/ui/button";

interface ListFetchErrorProps {
  message: string;
  onRetry: () => void;
}

export function ListFetchError({ message, onRetry }: ListFetchErrorProps) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-destructive">{message}</p>
        <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}
