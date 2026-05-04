import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ProductsPage from "./page";

const bulkArchiveMutateAsync = vi.fn().mockResolvedValue({ archivedCount: 2 });

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("./_hooks/use-product-queries", () => ({
  useProductList: () => ({
    data: {
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 1, hasNext: false, hasPrev: false },
    },
    isLoading: false,
  }),
  useCategoriesQuery: () => ({
    data: [{ id: "cat-1", name: "Scule", normalizedName: "scule", slug: "scule" }],
  }),
  useBrandsQuery: () => ({
    data: [{ id: "brand-1", name: "BrandX", slug: "brandx" }],
  }),
  useDeleteProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useArchiveProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useBulkArchiveProducts: () => ({ mutateAsync: bulkArchiveMutateAsync, isPending: false }),
}));

vi.mock("@/components/ui/searchable-multi-select", () => ({
  SearchableMultiSelect: ({
    value,
    onValueChange,
    options,
  }: {
    value: string[];
    onValueChange: (v: string[]) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <button
      type="button"
      data-testid={`multi-${options[0]?.label ?? "opt"}`}
      onClick={() => onValueChange(value.length ? [] : [options[0].value])}
    >
      Toggle {options[0]?.label}
    </button>
  ),
}));

describe("ProductsPage", () => {
  it("triggers bulk archive mutation with category filter", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<ProductsPage />);

    fireEvent.click(screen.getByTestId("multi-Scule"));
    fireEvent.click(screen.getByLabelText(/Include subcategorii active/i));
    fireEvent.click(screen.getByRole("button", { name: /Arhivează produsele potrivite/i }));

    await waitFor(() => {
      expect(bulkArchiveMutateAsync).toHaveBeenCalledWith({
        categoryIds: ["cat-1"],
        includeCategoryDescendants: true,
      });
    });
  });
});
