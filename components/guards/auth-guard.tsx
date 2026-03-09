"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

const PUBLIC_PATHS = ["/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));

  // Subscribe to the exact fields that determine auth so the component re-renders when they change
  const accessToken = useAuthStore((s) => s.accessToken);
  const expiresAt = useAuthStore((s) => s.expiresAt);
  const isAuthenticated =
    !!accessToken && !!expiresAt && typeof expiresAt === "number" && Date.now() < expiresAt;

  // Wait for zustand persist to rehydrate before deciding to redirect (avoids flash to login when token is in localStorage)
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    const store = useAuthStore as unknown as { persist?: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } };
    const persist = store.persist;
    if (persist?.hasHydrated?.()) {
      setHasHydrated(true);
      return;
    }
    const unsub = persist?.onFinishHydration?.(() => setHasHydrated(true));
    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (!hasHydrated || isPublic) return;
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, isPublic, router, pathname]);

  if (!hasHydrated && !isPublic) return null;
  if (!isPublic && !isAuthenticated) return null;
  return <>{children}</>;
}
