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

function roleRank(role?: string): number {
  if (role === "ceo") return 3;
  if (role === "admin") return 2;
  if (role === "freelancer") return 1;
  return 0;
}

export function MobileNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { state } = useCrm();
  const role = state.profile?.role;

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roleMin || roleRank(role) >= roleRank(item.roleMin),
  );

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center px-5 border-b border-sidebar-border">
        <Image
          src="/brand/meteoro-negativo.png"
          alt="Meteoro"
          width={100}
          height={28}
          style={{ objectFit: "contain" }}
          className="opacity-90"
        />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/[0.07] text-foreground"
                  : "text-sidebar-foreground/50 hover:bg-white/[0.04] hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
