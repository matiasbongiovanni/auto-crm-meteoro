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
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCrm } from "@/components/crm/provider";

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

function UserAvatar({ email, role }: { email?: string; role: string }) {
  const initials = email
    ? email.slice(0, 2).toUpperCase()
    : "MT";

  return (
    <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
        <span className="text-[11px] font-bold text-foreground/80">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-sidebar-foreground truncate leading-tight">
          Matías Weschta
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight mt-0.5">
          {role}
        </p>
      </div>
    </div>
  );
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
    <aside className="hidden md:flex md:w-52 lg:w-56 md:flex-col bg-sidebar border-r border-sidebar-border min-h-screen shrink-0">
      {/* Logo */}
      <div className="flex h-12 items-center px-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center">
          <Image
            src="/brand/meteoro-negativo.png"
            alt="Meteoro"
            width={96}
            height={28}
            className="shrink-0 opacity-90"
            style={{ objectFit: "contain" }}
          />
        </Link>
      </div>

      {/* User */}
      <UserAvatar email={session?.user?.email} role={role} />

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-all duration-100",
                active
                  ? "bg-white/[0.07] text-foreground"
                  : "text-sidebar-foreground/50 hover:bg-white/[0.04] hover:text-sidebar-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  active ? "text-foreground" : "text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60",
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: Settings + logout */}
      <div className="px-2 pb-3 border-t border-sidebar-border pt-2 space-y-0.5">
        <button
          className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-sidebar-foreground/50 hover:bg-white/[0.04] hover:text-sidebar-foreground transition-all duration-100"
        >
          <Settings className="h-3.5 w-3.5 text-sidebar-foreground/30" />
          <span>Configuración</span>
        </button>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-sidebar-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all duration-100"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
