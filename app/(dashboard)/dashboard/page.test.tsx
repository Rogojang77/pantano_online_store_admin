import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DashboardPage from "./page";

vi.mock("@/services/admin.service", () => ({
  adminService: {
    getDashboardStats: vi.fn().mockResolvedValue({
      products: 10,
      orders: 20,
      ordersPending: 2,
      users: 3,
      categories: 4,
    }),
    getAnalyticsFunnel: vi.fn().mockResolvedValue({
      windowDays: 30,
      since: new Date().toISOString(),
      counts: {
        viewProduct: 100,
        addToCart: 40,
        beginCheckout: 20,
        checkoutStep: 18,
        purchase: 10,
      },
      rates: {
        viewToCartPct: 40,
        cartToBeginCheckoutPct: 50,
        beginCheckoutToPurchasePct: 50,
        viewToPurchasePct: 10,
      },
    }),
  },
}));

vi.mock("@/services/odoo.service", () => ({
  odooService: {
    getSyncStatus: vi.fn().mockResolvedValue({ status: "IDLE" }),
    getLogs: vi.fn().mockResolvedValue({ logs: [] }),
  },
}));

vi.mock("@/services/orders.service", () => ({
  ordersService: {
    getList: vi.fn().mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 5, totalPages: 1, hasNext: false, hasPrev: false },
    }),
  },
}));

vi.mock("@/services/reservations.service", () => ({
  reservationsService: {
    getList: vi.fn().mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 5, totalPages: 1, hasNext: false, hasPrev: false },
    }),
  },
}));

describe("DashboardPage", () => {
  it("renders dashboard heading and sync card", async () => {
    render(<DashboardPage />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Odoo sync")).toBeInTheDocument();
    });
  });
});
