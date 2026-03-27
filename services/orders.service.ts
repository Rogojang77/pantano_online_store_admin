import api from "./api";
import type { PaginatedResponse } from "@/types/api";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "READY_FOR_PICKUP"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";
export type OrderType = "RESERVATION" | "DELIVERY";
export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED" | "FAILED";

export interface OrderListItem {
  id: string;
  orderNumber: string;
  userId: string;
  type: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus | string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  county?: string | null;
  postalCode?: string | null;
  country?: string | null;
  deliveryFee?: string | number | null;
  subtotal: string | number;
  total: string | number;
  weightTotal?: string | number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email: string; firstName: string | null; lastName: string | null };
  items?: Array<{
    id: string;
    quantity: number;
    unitPrice: string | number;
    totalPrice: string | number;
    variant?: { sku?: string; name?: string | null; product?: { name: string } };
  }>;
  reservation?: { id: string; pickupUntil: string | null } | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    odooInvoiceId: string | null;
  } | null;
}

export const ordersService = {
  getList: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    from?: string;
    to?: string;
    search?: string;
  }) =>
    api
      .get<PaginatedResponse<OrderListItem>>("/orders", { params })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<OrderListItem>(`/orders/${id}`).then((r) => r.data),

  updateStatus: (id: string, status: OrderStatus) =>
    api.put<OrderListItem>(`/orders/${id}/status`, { status }).then((r) => r.data),
};
