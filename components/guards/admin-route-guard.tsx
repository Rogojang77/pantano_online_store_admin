"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useIsAdmin } from "@/hooks/use-role-guard";

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isAdmin === false) {
      router.replace("/dashboard");
    }
  }, [isAdmin, router, pathname]);

  if (isAdmin === false) return null;
  return <>{children}</>;
}
