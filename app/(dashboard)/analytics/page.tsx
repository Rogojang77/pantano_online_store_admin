"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminService, type AnalyticsFunnel } from "@/services/admin.service";
import { notifyApiError } from "@/lib/notify-api-error";

const RANGE_OPTIONS = [7, 30, 90] as const;

export default function AnalyticsPage() {
  const [days, setDays] = useState<(typeof RANGE_OPTIONS)[number]>(30);
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<AnalyticsFunnel | null>(null);

  useEffect(() => {
    setLoading(true);
    adminService
      .getAnalyticsFunnel(days)
      .then(setFunnel)
      .catch((e) => notifyApiError(e, "Nu am putut încărca funnel-ul"))
      .finally(() => setLoading(false));
  }, [days]);

  const steps = useMemo(() => {
    if (!funnel) return [];
    return [
      { label: "View product", count: funnel.counts.viewProduct },
      { label: "Add to cart", count: funnel.counts.addToCart },
      { label: "Begin checkout", count: funnel.counts.beginCheckout },
      { label: "Checkout step", count: funnel.counts.checkoutStep },
      { label: "Purchase", count: funnel.counts.purchase },
    ];
  }, [funnel]);

  const maxCount = Math.max(...steps.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics funnel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conversii view → cart → checkout → purchase
          </p>
        </div>
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt}
              size="sm"
              variant={days === opt ? "default" : "outline"}
              onClick={() => setDays(opt)}
            >
              {opt} zile
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">View → Cart</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {loading || !funnel ? "—" : `${funnel.rates.viewToCartPct.toFixed(2)}%`}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cart → Checkout</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {loading || !funnel ? "—" : `${funnel.rates.cartToBeginCheckoutPct.toFixed(2)}%`}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Checkout → Purchase</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {loading || !funnel ? "—" : `${funnel.rates.beginCheckoutToPurchasePct.toFixed(2)}%`}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">View → Purchase</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {loading || !funnel ? "—" : `${funnel.rates.viewToPurchasePct.toFixed(2)}%`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle>Funnel steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Se încarcă...</p>
          ) : steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nu există date.</p>
          ) : (
            steps.map((step) => (
              <div key={step.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{step.label}</span>
                  <span className="tabular-nums text-muted-foreground">{step.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${Math.max(3, (step.count / maxCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
