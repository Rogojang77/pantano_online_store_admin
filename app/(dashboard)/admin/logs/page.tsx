"use client";

import { AdminRouteGuard } from "@/components/guards/admin-route-guard";

export default function LogsPage() {
  return (
    <AdminRouteGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
          <p className="text-muted-foreground mt-1">System and sync logs (Admin only)</p>
        </div>
        <p className="text-muted-foreground">Logs viewer — coming soon.</p>
      </div>
    </AdminRouteGuard>
  );
}