import api from "./api";
import type { ProductAttributeRequirementItem } from "./products.service";

export const attributesService = {
  getEffectiveByCategory: (categoryId: string) =>
    api
      .get<ProductAttributeRequirementItem[]>(`/attributes/category/${categoryId}/effective`)
      .then((response) => response.data),
};
