"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Package,
  ShoppingCart,
  CalendarClock,
  AlertTriangle,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { adminService, type DashboardStats } from "@/services/admin.service";
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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");

  useEffect(() => {
    adminService
      .getDashboardStats()
      .then(setStats)
      .catch(() => setStats({
        products: 0,
        orders: 0,
        ordersPending: 0,
        users: 0,
        categories: 0,
      }))
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      title: "Total products",
      value: stats?.products ?? 0,
      icon: Package,
      delay: 0,
    },
    {
      title: "Orders today",
      value: stats?.orders ?? 0,
      icon: ShoppingCart,
      delay: 1,
    },
    {
      title: "Reservations today",
      value: stats?.ordersPending ?? 0,
      icon: CalendarClock,
      delay: 2,
    },
    {
      title: "Low stock alerts",
      value: 0,
      icon: AlertTriangle,
      variant: "warning" as const,
      delay: 3,
    },
  ];

  const activityFeed = [
    { id: "1", text: "Order #1001 confirmed", time: "2 min ago", type: "order" },
    { id: "2", text: "Product \"Cement 25kg\" updated", time: "15 min ago", type: "product" },
    { id: "3", text: "Inventory sync completed", time: "1 hour ago", type: "sync" },
    { id: "4", text: "New reservation #R-204", time: "2 hours ago", type: "reservation" },
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
                  {syncStatus === "success" && "Last sync: Just now"}
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
              {activityFeed.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between border-b border-border/40 pb-4 last:border-0 last:pb-0"
                >
                  <span className="text-sm">{a.text}</span>
                  <span className="text-xs text-muted-foreground">{a.time}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
