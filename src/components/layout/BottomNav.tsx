"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  MessageSquare,
  MoreHorizontal,
  Kanban,
  CheckSquare,
  FileText,
  Bot,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCrm } from "@/components/crm/provider";

const PRIMARY = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/finanzas", label: "Finanzas", icon: DollarSign },
  { href: "/mensajeria", label: "Mensajería", icon: MessageSquare },
];

const SECONDARY = [
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/tareas", label: "Tareas", icon: CheckSquare },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/agentes", label: "Agentes", icon: Bot },
  { href: "/admin", label: "Admin", icon: ShieldCheck, roleMin: "ceo" as const },
];

function roleRank(role?: string): number {
  if (role === "ceo") return 3;
  if (role === "admin") return 2;
  return 1;
}

function isActive(href: string, pathname: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  const { state } = useCrm();
  const role = state.profile?.role;
  const [moreOpen, setMoreOpen] = useState(false);

  const secondaryVisible = SECONDARY.filter(
    (item) => !item.roleMin || roleRank(role) >= roleRank(item.roleMin),
  );

  const anySecondaryActive = secondaryVisible.some((item) => isActive(item.href, pathname));

  return (
    <>
      {/* Bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar/95 backdrop-blur-md border-t border-white/[0.06]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around px-2 h-16">
          {PRIMARY.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 flex-1 py-1 group"
              >
                <span className={cn(
                  "flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-200",
                  active ? "bg-white/[0.1]" : "bg-transparent group-active:bg-white/[0.05]"
                )}>
                  <item.icon className={cn(
                    "h-[18px] w-[18px] transition-all duration-200",
                    active ? "text-white" : "text-white/35"
                  )} strokeWidth={active ? 2.2 : 1.8} />
                </span>
                <span className={cn(
                  "text-[10px] leading-none font-medium transition-colors duration-200",
                  active ? "text-white" : "text-white/35"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Más */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-1 flex-1 py-1 group"
          >
            <span className={cn(
              "flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-200",
              (anySecondaryActive || moreOpen) ? "bg-white/[0.1]" : "bg-transparent group-active:bg-white/[0.05]"
            )}>
              <MoreHorizontal className={cn(
                "h-[18px] w-[18px] transition-all duration-200",
                (anySecondaryActive || moreOpen) ? "text-white" : "text-white/35"
              )} strokeWidth={1.8} />
            </span>
            <span className={cn(
              "text-[10px] leading-none font-medium transition-colors duration-200",
              (anySecondaryActive || moreOpen) ? "text-white" : "text-white/35"
            )}>
              Más
            </span>
          </button>
        </div>
      </nav>

      {/* More sheet */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          {/* Panel */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar rounded-t-2xl border-t border-white/[0.06] animate-in slide-in-from-bottom-4 duration-200" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30">Secciones</span>
              <button onClick={() => setMoreOpen(false)} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1 px-3 pb-5 pt-2">
              {secondaryVisible.map((item) => {
                const active = isActive(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-2 py-3 rounded-xl transition-all duration-150 active:scale-95"
                  >
                    <span className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-2xl",
                      active ? "bg-white/[0.1]" : "bg-white/[0.04]"
                    )}>
                      <item.icon className={cn(
                        "h-5 w-5",
                        active ? "text-white" : "text-white/40"
                      )} strokeWidth={active ? 2.2 : 1.8} />
                    </span>
                    <span className={cn(
                      "text-[10px] font-medium leading-none",
                      active ? "text-white" : "text-white/40"
                    )}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
