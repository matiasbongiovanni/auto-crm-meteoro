"use client";

import { usePathname } from "next/navigation";
import { useCrm } from "@/components/crm/provider";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/pipeline": "Pipeline",
  "/finanzas": "Finanzas",
  "/tareas": "Tareas",
  "/documentos": "Documentos",
  "/agentes": "Agentes",
  "/mensajeria": "Mensajería",
  "/admin": "Admin",
};

function getPageTitle(pathname: string): string {
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path)) return title;
  }
  return "Meteoro CRM";
}

export function AppHeader() {
  const pathname = usePathname();
  const { state } = useCrm();
  const title = getPageTitle(pathname);
  const role = state.profile?.role;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-sm px-4 md:px-6">
      {/* Mobile menu trigger (placeholder) */}
      <Button variant="ghost" size="icon" className="md:hidden">
        <Menu className="h-4 w-4" />
      </Button>

      {/* Page title */}
      <h1 className="text-[15px] font-semibold text-foreground/90 tracking-[-0.02em]">
        {title}
      </h1>

      <div className="flex-1" />

      {/* Role badge */}
      {role && (
        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-widest bg-white/5 text-foreground/50 border border-white/10">
          {role}
        </span>
      )}

      <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
        <Bell className="h-4 w-4" />
      </Button>
    </header>
  );
}
