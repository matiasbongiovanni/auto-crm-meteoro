"use client";

import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Kanban,
  CalendarDays,
  DollarSign,
  StickyNote,
  Repeat,
  ArrowUpRight,
  MessageSquare,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCrm } from "@/components/crm/provider";
import { useEmpresaDrawer } from "@/components/shared/EmpresaContext";
import { getEmpresaResumen, type Backlink, type BacklinkKind } from "@/lib/relaciones";
import { cn } from "@/lib/utils";

const KIND_META: Record<BacklinkKind, { icon: typeof Building2; label: string }> = {
  cliente: { icon: Building2, label: "Cliente" },
  lead: { icon: Users, label: "Lead" },
  pipeline: { icon: Kanban, label: "Pipeline" },
  evento: { icon: CalendarDays, label: "Agenda" },
  invoice: { icon: DollarSign, label: "Cobros" },
  nota: { icon: StickyNote, label: "Notas" },
  suscripcion: { icon: Repeat, label: "Suscripción" },
};

const GROUP_ORDER: BacklinkKind[] = [
  "cliente",
  "pipeline",
  "lead",
  "evento",
  "invoice",
  "suscripcion",
  "nota",
];

export function EmpresaDrawer() {
  const { empresa, close } = useEmpresaDrawer();
  const { state } = useCrm();
  const router = useRouter();

  const resumen = empresa ? getEmpresaResumen(empresa, state) : null;

  function go(href: string) {
    close();
    router.push(href);
  }

  const grouped: Record<string, Backlink[]> = {};
  if (resumen) {
    for (const bl of resumen.backlinks) {
      (grouped[bl.kind] ??= []).push(bl);
    }
  }

  return (
    <Sheet open={!!empresa} onOpenChange={(o) => { if (!o) close(); }}>
      <SheetContent className="w-full sm:max-w-md bg-card border-border/60 p-0">
        <SheetHeader className="px-5 py-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 glow-card">
              <Building2 className="h-4 w-4 text-foreground/80" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-[15px] font-semibold text-foreground truncate text-display">
                {empresa}
              </SheetTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {resumen?.totalConexiones ?? 0} conexiones en el CRM
              </p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-72px)]">
          <div className="px-5 py-4 space-y-5">
            {resumen && resumen.totalConexiones === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sin registros vinculados todavía.
              </p>
            )}

            {/* Accesos rápidos */}
            <div className="flex flex-wrap gap-2">
              <QuickJump label="Agenda" icon={CalendarDays} onClick={() => go("/calendario")} />
              <QuickJump label="Cobros" icon={DollarSign} onClick={() => go("/finanzas")} />
              <QuickJump label="Mensajería" icon={MessageSquare} onClick={() => go("/mensajeria")} />
            </div>

            {GROUP_ORDER.filter((k) => grouped[k]?.length).map((kind) => {
              const meta = KIND_META[kind];
              const Icon = meta.icon;
              return (
                <div key={kind} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="label-muted">{meta.label}</span>
                    <span className="text-[10px] text-muted-foreground">({grouped[kind].length})</span>
                  </div>
                  <div className="space-y-1">
                    {grouped[kind].map((bl, i) => (
                      <button
                        key={`${kind}-${i}`}
                        onClick={() => go(bl.href)}
                        className={cn(
                          "group w-full flex items-center gap-2 rounded-md px-3 py-2 text-left",
                          "bg-white/[0.02] hover:bg-white/[0.05] border border-border/40 transition-colors",
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-foreground/90 truncate">{bl.label}</p>
                          {bl.sublabel && (
                            <p className="text-[11px] text-muted-foreground truncate capitalize">{bl.sublabel}</p>
                          )}
                        </div>
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function QuickJump({ label, icon: Icon, onClick }: { label: string; icon: typeof Building2; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium border border-border/50 text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
