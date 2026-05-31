"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  DollarSign,
  CheckSquare,
  FileText,
  Bot,
  MessageSquare,
  ShieldCheck,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCrm } from "@/components/crm/provider";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/finanzas", label: "Finanzas", icon: DollarSign },
  { href: "/tareas", label: "Tareas", icon: CheckSquare },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/agentes", label: "Agentes", icon: Bot },
  { href: "/mensajeria", label: "Mensajería", icon: MessageSquare },
  { href: "/admin", label: "Admin", icon: ShieldCheck, roleMin: "ceo" as const },
];

type Role = "freelancer" | "admin" | "ceo";

function roleRank(role?: string): number {
  if (role === "ceo") return 3;
  if (role === "admin") return 2;
  if (role === "freelancer") return 1;
  return 0;
}

function roleMinRank(roleMin?: string): number {
  if (roleMin === "ceo") return 3;
  if (roleMin === "admin") return 2;
  return 0;
}

export function Sidebar() {
  const pathname = usePathname();
  const { session, state, signOut } = useCrm();
  const role = (state.profile?.role || "freelancer") as Role;

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roleMin || roleRank(role) >= roleMinRank(item.roleMin),
  );

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="hidden md:flex md:w-56 lg:w-60 md:flex-col bg-sidebar border-r border-sidebar-border min-h-screen shrink-0">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image
            src="/brand/meteoro-isotipo.svg"
            alt="Meteoro"
            width={24}
            height={24}
            className="shrink-0"
          />
          <span className="text-[15px] font-bold tracking-[-0.02em] text-foreground">
            METEORO
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-white/8 text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
                  : "text-sidebar-foreground/60 hover:bg-[var(--sidebar-accent)] hover:text-sidebar-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-foreground" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground",
                )}
              />
              <span className="truncate">{item.label}</span>
              {active && (
                <ChevronRight className="ml-auto h-3 w-3 text-foreground/40" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer: user + logout */}
      <div className="px-2 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-sidebar-accent/40 mb-1">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-sidebar-foreground/40 truncate label-muted">
              {role.toUpperCase()}
            </p>
            <p className="text-[12px] text-sidebar-foreground/80 truncate font-medium">
              {session?.user?.email || "—"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-[12px] text-sidebar-foreground/40 hover:text-destructive hover:bg-destructive/10 px-3"
          onClick={() => signOut()}
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
