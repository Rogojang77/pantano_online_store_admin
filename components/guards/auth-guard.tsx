"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { authService } from "@/services/auth.service";

const PUBLIC_PATHS = ["/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));
  const user = useAuthStore((s) => s.user);
  const setProfile = useAuthStore((s) => s.setProfile);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (isPublic) return;
    let cancelled = false;
    authService
      .getProfile()
      .then((profile) => {
        if (!cancelled) setProfile(profile);
      })
      .catch(() => {
        if (!cancelled) {
          clearAuth();
          router.replace("/login");
        }
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isPublic, pathname, router, setProfile, clearAuth]);

  useEffect(() => {
    if (isPublic || checkingSession) return;
    if (!user) {
      router.replace("/login");
    }
  }, [isPublic, checkingSession, user, router]);

  if (!isPublic && (checkingSession || !user)) return null;
  return <>{children}</>;
}
