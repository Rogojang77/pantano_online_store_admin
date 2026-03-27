import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  productsService,
  type CreateProductPayload,
  type UpdateProductPayload,
} from "@/services/products.service";
import { categoriesService } from "@/services/categories.service";
import { brandsService } from "@/services/brands.service";
import { attributesService } from "@/services/attributes.service";

export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

export const lookupKeys = {
  categories: ["categories"] as const,
  brands: ["brands"] as const,
  effectiveCategoryAttributes: (categoryId: string) =>
    ["category-effective-attributes", categoryId] as const,
};

export function useProductList(params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  categoryId?: string;
  brandId?: string;
  sortBy: string;
  sortDir: string;
}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productsService.getList({
      page: params.page,
      limit: params.limit,
      ...(params.search && { search: params.search }),
      ...(params.status && { status: params.status }),
      ...(params.categoryId && { categoryId: params.categoryId }),
      ...(params.brandId && { brandId: params.brandId }),
      sortBy: params.sortBy as "name" | "createdAt" | "updatedAt" | "sku",
      sortDir: params.sortDir as "asc" | "desc",
    }),
    // Keep current rows rendered while loading the next page to avoid table remount jank.
    placeholderData: keepPreviousData,
  });
}

export function useProductDetail(id: string | undefined) {
  return useQuery({
    queryKey: productKeys.detail(id!),
    queryFn: () => productsService.getById(id!),
    enabled: !!id,
  });
}

export function useCategoriesQuery(selectedCategoryId?: string) {
  return useQuery({
    queryKey: [...lookupKeys.categories, selectedCategoryId ?? "none"],
    queryFn: async () => {
      const pageSize = 100;
      let page = 1;
      let totalPages = 1;
      const list: Awaited<ReturnType<typeof categoriesService.getList>>["data"] = [];

      while (page <= totalPages) {
        const response = await categoriesService.getList({ page, limit: pageSize });
        list.push(...response.data);
        totalPages = Math.max(1, response.meta.totalPages ?? 1);
        page += 1;
      }

      if (!selectedCategoryId || list.some((item) => item.id === selectedCategoryId)) {
        return list;
      }
      try {
        const selected = await categoriesService.getById(selectedCategoryId);
        return [selected, ...list];
      } catch {
        return list;
      }
    },
    staleTime: 5 * 60_000,
  });
}

export function useBrandsQuery() {
  return useQuery({
    queryKey: lookupKeys.brands,
    queryFn: () => brandsService.getAll(),
    staleTime: 5 * 60_000,
  });
}

export function useEffectiveCategoryAttributesQuery(categoryId: string | undefined) {
  return useQuery({
    queryKey: lookupKeys.effectiveCategoryAttributes(categoryId ?? "none"),
    queryFn: () => attributesService.getEffectiveByCategory(categoryId!),
    enabled: !!categoryId,
    staleTime: 60_000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => productsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProductPayload) => productsService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useInvalidateProduct(id: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
  };
}
