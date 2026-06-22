"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/pipeline": "Pipeline",
  "/clientes": "Clientes",
  "/finanzas": "Finanzas",
  "/calendario": "Calendario",
  "/tareas": "Tareas",
  "/documentos": "Documentos",
  "/agentes": "Agentes",
  "/mensajeria": "Mensajería",
  "/boveda": "Bóveda",
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

  function openCommand() {
    window.dispatchEvent(new Event("meteoro:open-command"));
  }

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-4 border-b border-border bg-background/90 backdrop-blur-sm px-5">
      <h1 className="text-[14px] font-semibold text-foreground/70 tracking-[-0.01em] text-display">
        {title}
      </h1>
      <div className="flex-1" />
      <button
        onClick={openCommand}
        className="flex items-center gap-2 rounded-md border border-border/50 bg-white/[0.02] px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
        title="Buscar (Cmd/Ctrl + K)"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline text-[11px]">Buscar</span>
        <kbd className="hidden sm:inline text-[9px] font-mono border border-border/50 rounded px-1 py-0.5 text-muted-foreground/70">
          ⌘K
        </kbd>
      </button>
      <button className="relative text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-white/5">
        <Bell className="h-3.5 w-3.5" />
      </button>
    </header>
  );
}
