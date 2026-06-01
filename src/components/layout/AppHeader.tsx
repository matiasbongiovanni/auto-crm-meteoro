"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

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
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-4 border-b border-border bg-background/90 backdrop-blur-sm px-5">
      <h1 className="text-[14px] font-semibold text-foreground/70 tracking-[-0.01em]">
        {title}
      </h1>
      <div className="flex-1" />
      <button className="relative text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-white/5">
        <Bell className="h-3.5 w-3.5" />
      </button>
    </header>
  );
}
