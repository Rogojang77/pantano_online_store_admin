"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, BarChart3, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersService, type OrderRevenueSummary } from "@/services/orders.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ViewMode = "day" | "month";

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfLocalMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

const money = new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" });

function formatMoney(value: string) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return "—";
  return money.format(n);
}

const weekdayRo = new Intl.DateTimeFormat("ro-RO", { weekday: "short" });

export function OrderRevenueCard() {
  const [mode, setMode] = useState<ViewMode>("day");
  const [dayCursor, setDayCursor] = useState(() => startOfLocalDay(new Date()));
  const [monthCursor, setMonthCursor] = useState(() => startOfLocalMonth(new Date()));
  const [data, setData] = useState<OrderRevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRevenue = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === "day") {
        const from = startOfLocalDay(dayCursor);
        const to = addDays(from, 1);
        const res = await ordersService.getRevenueSummary({
          from: from.toISOString(),
          to: to.toISOString(),
        });
        setData(res);
      } else {
        const from = startOfLocalMonth(monthCursor);
        const to = addMonths(from, 1);
        const res = await ordersService.getRevenueSummary({
          from: from.toISOString(),
          to: to.toISOString(),
          groupBy: "day",
        });
        setData(res);
      }
    } catch {
      setData(null);
      toast.error("Nu s-a putut încărca valoarea comenzilor");
    } finally {
      setLoading(false);
    }
  }, [mode, dayCursor, monthCursor]);

  useEffect(() => {
    void fetchRevenue();
  }, [fetchRevenue]);

  const isToday = (d: Date) => {
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  };

  const isThisMonth = (d: Date) => {
    const t = new Date();
    return d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  };

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="space-y-1 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">Valoare comenzi</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Total (RON) și număr de comenzi, după perioadă
            </p>
          </div>
          <div className="flex rounded-lg border border-border/80 p-0.5">
            {(["day", "month"] as const).map((m) => (
              <Button
                key={m}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 rounded-md px-3 text-xs",
                  mode === m && "bg-background shadow-sm"
                )}
                onClick={() => setMode(m)}
              >
                {m === "day" ? "Zi" : "Lună"}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "day" && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Ziua anterioară"
                onClick={() => setDayCursor((d) => addDays(d, -1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Ziua următoare"
                onClick={() => setDayCursor((d) => addDays(d, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
              {!isToday(dayCursor) && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setDayCursor(startOfLocalDay(new Date()))}
                >
                  <Calendar className="size-3.5" aria-hidden />
                  Astăzi
                </Button>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {dayCursor.toLocaleDateString("ro-RO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              {isToday(dayCursor) && (
                <span className="text-xs text-primary">Azi</span>
              )}
            </div>
          </div>
        )}

        {mode === "month" && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="Luna anterioară"
                onClick={() => setMonthCursor((d) => addMonths(d, -1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="Luna următoare"
                onClick={() => setMonthCursor((d) => addMonths(d, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
              {!isThisMonth(monthCursor) && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setMonthCursor(startOfLocalMonth(new Date()))}
                >
                  <Calendar className="size-3.5" aria-hidden />
                  Luna curentă
                </Button>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium capitalize">
                {monthCursor.toLocaleDateString("ro-RO", { month: "long", year: "numeric" })}
              </p>
              {isThisMonth(monthCursor) && (
                <span className="text-xs text-primary">Luna curentă</span>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-40 rounded-lg" />
            <Skeleton className="h-6 w-28 rounded-lg" />
          </div>
        ) : data ? (
          <>
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Valoare totală
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatMoney(data.totalRevenue)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Comenzi
                </p>
                <p className="text-2xl font-bold tabular-nums">{data.orderCount}</p>
              </div>
            </div>

            {mode === "month" && data.byDay && data.byDay.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full min-w-[320px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40">
                      <th className="px-3 py-2 font-medium">Zi</th>
                      <th className="px-3 py-2 font-medium text-right">Comenzi</th>
                      <th className="px-3 py-2 text-right font-medium">Valoare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byDay.map((row) => {
                      const p = row.date.split("-").map((x) => parseInt(x, 10));
                      const dt = new Date(p[0], p[1] - 1, p[2]);
                      const hasOrders = row.orderCount > 0;
                      return (
                        <tr
                          key={row.date}
                          className={cn(
                            "border-b border-border/30 last:border-0",
                            !hasOrders && "text-muted-foreground/70"
                          )}
                        >
                          <td className="px-3 py-1.5">
                            <span className="tabular-nums">
                              {dt.toLocaleDateString("ro-RO", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                            <span className="ml-1 text-xs text-muted-foreground">
                              {weekdayRo.format(dt)}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{row.orderCount}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                            {formatMoney(row.totalRevenue)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
