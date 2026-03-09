import api from "./api";
import type { PaginatedResponse } from "@/types/api";

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  normalizedName?: string;
  parentId: string | null;
  level: number;
  isActive: boolean;
  isVisibleInMenu?: boolean;
  sortOrder: number;
  productCount?: number;
  iconName?: string | null;
  imageUrl?: string | null;
  canonicalId?: string | null;
  createdAt: string;
  updatedAt: string;
  parent?: { id: string; name: string; slug: string } | null;
  children?: CategoryItem[];
  _count?: { products: number };
}

export interface CreateCategoryPayload {
  name: string;
  slug?: string;
  parentId?: string;
  isActive?: boolean;
  isVisibleInMenu?: boolean;
  sortOrder?: number;
  iconName?: string;
  imageUrl?: string;
  description?: string;
}

export interface UpdateCategoryPayload extends Partial<CreateCategoryPayload> {}

export interface DuplicateGroup {
  normalizedName: string;
  categories: {
    id: string;
    name: string;
    slug: string;
    level: number;
    parentId: string | null;
    parentName: string | null;
    productCount: number;
  }[];
}

export interface MergeResult {
  success: boolean;
  sourceId: string;
  targetId: string;
  productsReassigned: number;
  relationsUpdated: number;
}

export interface MegaMenuData {
  categories: MegaMenuLevel1[];
  featuredCategories: { id: string; name: string; slug: string; imageUrl: string | null }[];
  lastUpdated: string;
}

export interface MegaMenuLevel1 {
  id: string;
  name: string;
  slug: string;
  level: 1;
  iconName: string | null;
  imageUrl: string | null;
  productCount: number;
  children: MegaMenuLevel2[];
  shortcuts: MegaMenuShortcut[];
}

export interface MegaMenuLevel2 {
  id: string;
  name: string;
  slug: string;
  level: 2;
  productCount: number;
  children: MegaMenuLevel3[];
  shortcuts: MegaMenuShortcut[];
}

export interface MegaMenuLevel3 {
  id: string;
  name: string;
  slug: string;
  level: 3;
  productCount: number;
}

export interface MegaMenuShortcut {
  id: string;
  label: string;
  targetSlug: string;
  targetName: string;
}

export const categoriesService = {
  getList: (params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    isVisibleInMenu?: boolean;
    level?: number;
    search?: string;
    parentId?: string;
  }) =>
    api
      .get<PaginatedResponse<CategoryItem>>("/categories", { params })
      .then((r) => r.data),

  getTree: () =>
    api.get<CategoryItem[]>("/categories/tree").then((r) => r.data),

  getAdminTree: () =>
    api.get<(CategoryItem & { children: CategoryItem[]; _count: { products: number } })[]>(
      "/categories/admin/tree"
    ).then((r) => r.data),

  getMegaMenu: () =>
    api.get<MegaMenuData>("/categories/mega-menu").then((r) => r.data),

  getById: (id: string) =>
    api.get<CategoryItem>(`/categories/${id}`).then((r) => r.data),

  getBySlug: (slug: string) =>
    api.get<CategoryItem>(`/categories/slug/${slug}`).then((r) => r.data),

  create: (payload: CreateCategoryPayload) =>
    api.post<CategoryItem>("/categories", payload).then((r) => r.data),

  update: (id: string, payload: UpdateCategoryPayload) =>
    api.put<CategoryItem>(`/categories/${id}`, payload).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/categories/${id}`).then((r) => r.data),

  getDuplicates: () =>
    api.get<DuplicateGroup[]>("/categories/admin/duplicates").then((r) => r.data),

  merge: (sourceId: string, targetId: string) =>
    api
      .post<MergeResult>("/categories/merge", { sourceId, targetId })
      .then((r) => r.data),

  bulkMove: (categoryIds: string[], newParentId: string | null) =>
    api
      .post<{ count: number }>("/categories/bulk-move", { categoryIds, newParentId })
      .then((r) => r.data),

  updateSortOrder: (updates: { id: string; sortOrder: number }[]) =>
    api.post("/categories/update-sort-order", { updates }).then((r) => r.data),

  toggleVisibility: (id: string) =>
    api.post<CategoryItem>(`/categories/${id}/toggle-visibility`).then((r) => r.data),

  createShortcut: (
    displayUnderParentId: string,
    linkToCategoryId: string,
    label?: string
  ) =>
    api
      .post("/categories/shortcuts", { displayUnderParentId, linkToCategoryId, label })
      .then((r) => r.data),

  deleteShortcut: (id: string) =>
    api.delete(`/categories/shortcuts/${id}`).then((r) => r.data),

  addAdditionalParent: (categoryId: string, parentId: string) =>
    api
      .post("/categories/additional-parent", { categoryId, parentId })
      .then((r) => r.data),

  removeAdditionalParent: (categoryId: string, parentId: string) =>
    api
      .delete(`/categories/additional-parent/${categoryId}/${parentId}`)
      .then((r) => r.data),

  invalidateCache: () =>
    api.post("/categories/invalidate-cache").then((r) => r.data),
};
