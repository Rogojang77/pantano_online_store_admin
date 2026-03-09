"use client";

import { AdminRouteGuard } from "@/components/guards/admin-route-guard";

export default function SystemSettingsPage() {
  return (
    <AdminRouteGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1">Environment and API keys (Admin only)</p>
        </div>
        <p className="text-muted-foreground">System settings — coming soon.</p>
      </div>
    </AdminRouteGuard>
  );
}