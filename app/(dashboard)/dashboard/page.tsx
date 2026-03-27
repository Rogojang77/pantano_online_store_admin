"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Package,
  ShoppingCart,
  CalendarClock,
  Clock3,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { adminService, type DashboardStats } from "@/services/admin.service";
import { odooService } from "@/services/odoo.service";
import { ordersService } from "@/services/orders.service";
import { reservationsService } from "@/services/reservations.service";
import type { SyncState } from "@/types/odoo";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

type StatCard = {
  title: string;
  value: number;
  icon: typeof Package;
  delay: number;
  variant?: "default" | "warning";
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ordersToday, setOrdersToday] = useState(0);
  const [reservationsToday, setReservationsToday] = useState(0);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [activityFeed, setActivityFeed] = useState<
    { id: string; text: string; time: string; createdAt: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    Promise.all([
      adminService.getDashboardStats().catch(() => ({
        products: 0,
        orders: 0,
        ordersPending: 0,
        users: 0,
        categories: 0,
      })),
      odooService.getSyncStatus().catch(() => ({ status: "IDLE" as const })),
      odooService.getLogs({ limit: 8 }).catch(() => ({ logs: [] })),
      ordersService.getList({ page: 1, limit: 5 }).catch(() => ({
        data: [],
        meta: { total: 0, page: 1, limit: 5, totalPages: 1, hasNext: false, hasPrev: false },
      })),
      ordersService
        .getList({
          page: 1,
          limit: 1,
          from: startOfDay.toISOString(),
          to: endOfDay.toISOString(),
        })
        .catch(() => ({
          data: [],
          meta: { total: 0, page: 1, limit: 1, totalPages: 1, hasNext: false, hasPrev: false },
        })),
      reservationsService.getList({ page: 1, limit: 5 }).catch(() => ({
        data: [],
        meta: { total: 0, page: 1, limit: 5, totalPages: 1, hasNext: false, hasPrev: false },
      })),
      reservationsService
        .getList({
          page: 1,
          limit: 1,
          from: startOfDay.toISOString(),
          to: endOfDay.toISOString(),
        })
        .catch(() => ({
          data: [],
          meta: { total: 0, page: 1, limit: 1, totalPages: 1, hasNext: false, hasPrev: false },
        })),
    ])
      .then(
        ([
          statsData,
          syncData,
          logsData,
          recentOrders,
          ordersTodayData,
          recentReservations,
          reservationsTodayData,
        ]) => {
          setStats(statsData);
          setSyncState(syncData);
          setOrdersToday(ordersTodayData.meta.total);
          setReservationsToday(reservationsTodayData.meta.total);

          const orderEvents = recentOrders.data.map((order) => ({
            id: `order-${order.id}`,
            text: `Order #${order.orderNumber} · ${order.status.replace(/_/g, " ")}`,
            time: order.createdAt,
            createdAt: order.createdAt,
          }));

          const reservationEvents = recentReservations.data.map((reservation) => ({
            id: `reservation-${reservation.id}`,
            text: `Reservation #${reservation.order?.orderNumber ?? reservation.orderId}`,
            time: reservation.createdAt,
            createdAt: reservation.createdAt,
          }));

          const syncEvents = logsData.logs.map((log) => ({
            id: `sync-${log.id}`,
            text: `Odoo: ${log.message}`,
            time: log.createdAt,
            createdAt: log.createdAt,
          }));

          const merged = [...orderEvents, ...reservationEvents, ...syncEvents]
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            )
            .slice(0, 8);

          setActivityFeed(merged);
        },
      )
      .finally(() => setLoading(false));
  }, []);

  const formatRelativeTime = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  };

  const syncStatus = syncState?.status === "RUNNING"
    ? "syncing"
    : syncState?.status === "SUCCESS"
      ? "success"
      : syncState?.status === "FAILED"
        ? "error"
        : "idle";

  const statCards: StatCard[] = [
    {
      title: "Total products",
      value: stats?.products ?? 0,
      icon: Package,
      delay: 0,
    },
    {
      title: "Orders today",
      value: ordersToday,
      icon: ShoppingCart,
      delay: 1,
    },
    {
      title: "Reservations today",
      value: reservationsToday,
      icon: CalendarClock,
      delay: 2,
    },
    {
      title: "Pending orders",
      value: stats?.ordersPending ?? 0,
      icon: Clock3,
      delay: 3,
      variant: "warning",
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your construction materials store
        </p>
      </div>

      {/* Sync status indicator */}
      <motion.div variants={item}>
        <Card className="rounded-2xl border-border/60">
          <CardContent className="flex flex-row items-center justify-between py-4">
            <div className="flex items-center gap-3">
              {syncStatus === "syncing" ? (
                <Loader2 className="size-5 animate-spin text-primary" />
              ) : syncStatus === "success" ? (
                <CheckCircle2 className="size-5 text-emerald-500" />
              ) : syncStatus === "error" ? (
                <XCircle className="size-5 text-destructive" />
              ) : (
                <Activity className="size-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Odoo sync</p>
                <p className="text-sm text-muted-foreground">
                  {syncStatus === "idle" && "Last sync: —"}
                  {syncStatus === "syncing" && "Sync in progress…"}
                  {syncStatus === "success" && `Last sync: ${syncState?.lastSyncAt ? formatRelativeTime(syncState.lastSyncAt) : "—"}`}
                  {syncStatus === "error" && "Last sync failed"}
                </p>
              </div>
            </div>
            <Badge
              variant={
                syncStatus === "success"
                  ? "success"
                  : syncStatus === "error"
                    ? "destructive"
                    : syncStatus === "syncing"
                      ? "secondary"
                      : "outline"
              }
            >
              {syncStatus.toUpperCase()}
            </Badge>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats grid */}
      <motion.div
        variants={container}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {statCards.map((stat, i) => (
          <motion.div key={stat.title} variants={item}>
            <Card className="rounded-2xl border-border/60 transition-shadow hover:shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon
                  className={cn(
                    "size-4",
                    stat.variant === "warning" && "text-amber-500"
                  )}
                />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16 rounded-xl" />
                ) : (
                  <span className="text-2xl font-bold">{stat.value}</span>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent activity */}
      <motion.div variants={item}>
        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest events in your store
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {loading ? (
                <>
                  <Skeleton className="h-5 w-full rounded-xl" />
                  <Skeleton className="h-5 w-full rounded-xl" />
                  <Skeleton className="h-5 w-full rounded-xl" />
                </>
              ) : activityFeed.length === 0 ? (
                <li className="text-sm text-muted-foreground">No recent activity.</li>
              ) : (
                activityFeed.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between border-b border-border/40 pb-4 last:border-0 last:pb-0"
                  >
                    <span className="text-sm">{a.text}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(a.time)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
