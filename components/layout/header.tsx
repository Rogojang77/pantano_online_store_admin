"use client";

import { useRouter } from "next/navigation";
import { LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { SidebarTrigger } from "./sidebar";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md">
      <SidebarTrigger onOpen={onMenuClick ?? (() => {})} />
      <div className="flex flex-1 items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {user?.email}
        </span>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out">
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
