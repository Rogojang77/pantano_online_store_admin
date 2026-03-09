"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  LayoutPanelTop,
  Image as ImageIcon,
  Percent,
  ShoppingCart,
  CalendarClock,
  Warehouse,
  Users,
  Shield,
  Settings,
  Plug,
  FileText,
  ChevronLeft,
  Menu,
  X,
  ContactRound,
  MessageCircleQuestion,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanAccessAdminSection } from "@/hooks/use-role-guard";
import { useIsMd } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.svg";

const commonNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/media", label: "Media", icon: ImageIcon },
  { href: "/cms", label: "CMS", icon: LayoutPanelTop },
  { href: "/promotions", label: "Promotions", icon: Percent },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/reservations", label: "Reservations", icon: CalendarClock },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
];

const adminNav = [
  { href: "/users", label: "Users", icon: Users },
  { href: "/roles", label: "Roles", icon: Shield },
  { href: "/contact", label: "Contact", icon: ContactRound },
  { href: "/newsletter", label: "Newsletter", icon: Mail },
  { href: "/faq", label: "FAQ submissions", icon: MessageCircleQuestion },
  { href: "/admin/settings", label: "System Settings", icon: Settings },
  { href: "/admin/integrations/odoo", label: "Odoo Integration", icon: Plug },
  { href: "/admin/logs", label: "Logs", icon: FileText },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (v: boolean) => void;
}

export function Sidebar({
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileOpenChange,
}: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = useCanAccessAdminSection();

  const NavLink = ({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => {
    const active = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
    return (
      <Link
        href={href}
        onClick={() => onMobileOpenChange(false)}
        className={cn(
          "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        )}
      >
        <Icon className="size-5 shrink-0" />
        <AnimatePresence initial={false}>
          {(!collapsed || mobileOpen) && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    );
  };

  const content = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-border/60 px-4">
        {(!collapsed || mobileOpen) && (
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-foreground">
            <img src={logo.src} alt="Pantano" className="size-38 mr-2" />
          </Link>
        )}
        {mobileOpen ? (
          <Button variant="ghost" size="icon" onClick={() => onMobileOpenChange(false)}>
            <X className="size-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => onCollapsedChange(!collapsed)}
          >
            <ChevronLeft
              className={cn("size-5 transition-transform duration-200", collapsed && "rotate-180")}
            />
          </Button>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        <div className="space-y-1">
          {commonNav.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </div>
        {isAdmin && (
          <>
            <div className="my-3 h-px bg-border" />
            <p
              className={cn(
                "px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                (collapsed && !mobileOpen) && "invisible h-0 overflow-hidden py-0"
              )}
            >
              Admin
            </p>
            <div className="space-y-1">
              {adminNav.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
              ))}
            </div>
          </>
        )}
      </nav>
    </>
  );

  const isMd = useIsMd();
  const width = isMd ? (collapsed ? 72 : 280) : 280;
  const x = isMd ? 0 : mobileOpen ? 0 : -280;

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => onMobileOpenChange(false)}
          />
        )}
      </AnimatePresence>
      <motion.aside
        initial={false}
        animate={{ width, x }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed left-0 top-0 z-50 flex h-screen flex-col overflow-hidden border-r border-border/60 bg-card shadow-lg md:left-0 md:shadow-none"
      >
        <div className="flex h-full min-w-0 flex-1 flex-col">
          {content}
        </div>
      </motion.aside>
    </>
  );
}

export function SidebarTrigger({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpen}>
      <Menu className="size-5" />
    </Button>
  );
}
