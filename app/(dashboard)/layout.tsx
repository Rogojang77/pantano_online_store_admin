"use client";

import { AuthGuard } from "@/components/guards/auth-guard";
import { DashboardLayoutClient } from "@/components/layout/dashboard-layout-client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </AuthGuard>
  );
}
