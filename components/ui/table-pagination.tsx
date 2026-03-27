"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageToken = number | "left-ellipsis" | "right-ellipsis";

interface TablePaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function buildPageTokens(currentPage: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const normalized = Array.from(pages).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const tokens: PageToken[] = [];

  for (let i = 0; i < normalized.length; i++) {
    const page = normalized[i];
    const prev = normalized[i - 1];

    if (i > 0 && prev != null) {
      const gap = page - prev;
      if (gap === 2) {
        tokens.push(prev + 1);
      } else if (gap > 2) {
        tokens.push(prev < currentPage ? "left-ellipsis" : "right-ellipsis");
      }
    }

    tokens.push(page);
  }

  return tokens;
}

export function TablePagination({ page, totalPages, onPageChange, className }: TablePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const currentPage = page + 1;
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const pageTokens = buildPageTokens(currentPage, totalPages);

  const goToPage = (nextPage: number) => {
    const bounded = Math.max(1, Math.min(totalPages, Math.trunc(nextPage)));
    onPageChange(bounded - 1);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="outline"
        size="sm"
        className="rounded-xl px-2"
        onClick={() => goToPage(1)}
        disabled={!hasPrev}
        aria-label="Go to first page"
      >
        <ChevronsLeft className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="rounded-xl px-2"
        onClick={() => goToPage(currentPage - 1)}
        disabled={!hasPrev}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="size-4" />
      </Button>

      {pageTokens.map((token) => {
        if (token === "left-ellipsis" || token === "right-ellipsis") {
          return (
            <span key={token} className="px-2 text-sm text-muted-foreground">
              ...
            </span>
          );
        }

        const isActive = token === currentPage;
        return (
          <Button
            key={token}
            variant={isActive ? "default" : "outline"}
            size="sm"
            className="min-w-9 rounded-xl px-3"
            onClick={() => goToPage(token)}
            aria-current={isActive ? "page" : undefined}
            aria-label={`Go to page ${token}`}
          >
            {token}
          </Button>
        );
      })}

      <Button
        variant="outline"
        size="sm"
        className="rounded-xl px-2"
        onClick={() => goToPage(currentPage + 1)}
        disabled={!hasNext}
        aria-label="Go to next page"
      >
        <ChevronRight className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="rounded-xl px-2"
        onClick={() => goToPage(totalPages)}
        disabled={!hasNext}
        aria-label="Go to last page"
      >
        <ChevronsRight className="size-4" />
      </Button>
    </div>
  );
}
