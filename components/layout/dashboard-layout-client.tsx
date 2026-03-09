"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Sidebar, SidebarTrigger } from "./sidebar";
import { Header } from "./header";
import { useIsMd } from "@/hooks/use-media-query";

export function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMd = useIsMd();
  const sidebarWidth = isMd ? (collapsed ? 72 : 280) : 0; // On mobile drawer overlays, so no margin

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const setMobileOpenState = useCallback((v: boolean) => setMobileOpen(v), []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpenState}
      />
      <motion.div
        className="flex flex-col min-w-0"
        initial={false}
        animate={{ marginLeft: sidebarWidth }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
      >
        <Header onMenuClick={openMobile} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </motion.div>
    </div>
  );
}
