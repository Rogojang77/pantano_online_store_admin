import api from "./api";
import type { PaginatedResponse } from "@/types/api";
import type { OrderStatus } from "./orders.service";

export interface ReservationListItem {
  id: string;
  orderId: string;
  userId: string;
  pickupUntil: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    items?: Array<{
      variant?: { product?: { name: string }; sku?: string };
      quantity: number;
    }>;
    user?: { email: string; firstName: string | null; lastName: string | null };
  };
  user?: { id: string; email: string; firstName: string | null; lastName: string | null; phone: string | null };
}

export const reservationsService = {
  getList: (params?: { page?: number; limit?: number; from?: string; to?: string }) =>
    api
      .get<PaginatedResponse<ReservationListItem>>("/reservations/list", { params })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<ReservationListItem>(`/reservations/${id}`).then((r) => r.data),

  updatePickupUntil: (id: string, pickupUntil: string) =>
    api
      .put<ReservationListItem>(`/reservations/${id}/pickup-until`, { pickupUntil })
      .then((r) => r.data),
};
