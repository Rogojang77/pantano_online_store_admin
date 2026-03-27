import { useState, useEffect } from "react";
import { categoriesService, type CategoryItem } from "@/services/categories.service";
import { brandsService, type BrandItem } from "@/services/brands.service";

export function useCategoriesAndBrands() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [cats, brandsResp] = await Promise.all([
          categoriesService.getList({ limit: 100 }),
          brandsService.getAll(),
        ]);
        if (!cancelled) {
          setCategories(cats.data);
          setBrands(brandsResp);
        }
      } catch {
        if (!cancelled) setError("Failed to load categories and brands.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, setCategories, brands, setBrands, loading, error, setError };
}
