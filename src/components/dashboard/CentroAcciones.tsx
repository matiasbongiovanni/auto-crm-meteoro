"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { DollarSign, FileText, RefreshCw, CheckCircle2, MessageCircle, Check } from "lucide-react";
import type { Cliente, Lead, Invoice, Proposal, CalendarEvent } from "@/types/crm";
import { carteraAbierta } from "@/lib/cobranzas";
import { diasARenovacion } from "@/lib/clientes";
import { buildWhatsAppUrl, findTelefono, msgCobro, msgSeguimientoPropuesta, msgRenovacion } from "@/lib/whatsapp";
import { formatUsd } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  clientes: Cliente[];
  leads: Lead[];
  invoices: Invoice[];
  proposals: Proposal[];
  calendarEvents: CalendarEvent[];
  onCompleteEvent: (event: CalendarEvent) => Promise<void> | void;
};

type Accion = {
  id: string;
  kind: "cobro" | "propuesta" | "renovacion" | "tarea";
  titulo: string;
  detalle: string;
  urgente: boolean;
  whatsappUrl?: string | null;
  onDone?: () => void;
};

const KIND_META: Record<Accion["kind"], { icon: typeof DollarSign; label: string; color: string }> = {
  cobro:      { icon: DollarSign, label: "Cobro",      color: "text-rose-400" },
  propuesta:  { icon: FileText,   label: "Propuesta",  color: "text-sky-400" },
  renovacion: { icon: RefreshCw,  label: "Renovación", color: "text-amber-400" },
  tarea:      { icon: CheckCircle2, label: "Tarea",    color: "text-emerald-400" },
};

const HOY = () => new Date().toISOString().slice(0, 10);

export function CentroAcciones({ clientes, leads, invoices, proposals, calendarEvents, onCompleteEvent }: Props) {
  const acciones = useMemo<Accion[]>(() => {
    const hoy = HOY();
    const dir = { clientes, leads };
    const out: Accion[] = [];

    // 1. Facturas vencidas (cobro)
    for (const { invoice, mora } of carteraAbierta(invoices)) {
      if (mora <= 0) continue;
      const nombre = clientes.find((c) => c.id === invoice.cliente_id)?.nombre || "Cliente";
      const tel = findTelefono(nombre, dir);
      out.push({
        id: `cobro:${invoice.id}`,
        kind: "cobro",
        titulo: nombre,
        detalle: `${formatUsd(invoice.monto_usd)} · ${mora}d de mora`,
        urgente: mora > 7,
        whatsappUrl: buildWhatsAppUrl(tel, msgCobro(nombre, invoice, mora)),
      });
    }

    // 2. Seguimientos de propuestas (próximo_seguimiento <= hoy, estado activo)
    for (const p of proposals) {
      if (!p.proximo_seguimiento) continue;
      if (!["enviado", "en_negociacion"].includes(p.estado)) continue;
      if (p.proximo_seguimiento > hoy) continue;
      const tel = findTelefono(p.cliente, dir);
      out.push({
        id: `prop:${p.id}`,
        kind: "propuesta",
        titulo: p.cliente || "Cliente",
        detalle: `Seguir propuesta${p.concepto ? ` · ${p.concepto}` : ""}`,
        urgente: p.proximo_seguimiento < hoy,
        whatsappUrl: buildWhatsAppUrl(tel, msgSeguimientoPropuesta(p.cliente, p.concepto)),
      });
    }

    // 3. Renovaciones en <= 7 días
    for (const c of clientes) {
      if (c.status !== "activo") continue;
      const dias = diasARenovacion(c);
      if (dias === null || dias < 0 || dias > 7) continue;
      const tel = findTelefono(c.nombre, dir);
      out.push({
        id: `renov:${c.id}`,
        kind: "renovacion",
        titulo: c.nombre,
        detalle: dias === 0 ? "Renueva hoy" : `Renueva en ${dias}d`,
        urgente: dias <= 2,
        whatsappUrl: buildWhatsAppUrl(tel, msgRenovacion(c.nombre, dias)),
      });
    }

    // 4. Tareas/eventos de hoy y vencidos, no completados
    for (const e of calendarEvents) {
      if (e.completed) continue;
      if (!e.date || e.date > hoy) continue;
      out.push({
        id: `tarea:${e.id}`,
        kind: "tarea",
        titulo: e.title,
        detalle: e.date < hoy ? "Vencida" : "Hoy",
        urgente: e.date < hoy,
        onDone: () => { void onCompleteEvent({ ...e, completed: true }); },
      });
    }

    // Urgentes primero, luego por tipo
    const order: Accion["kind"][] = ["cobro", "propuesta", "renovacion", "tarea"];
    return out.sort((a, b) => {
      if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;
      return order.indexOf(a.kind) - order.indexOf(b.kind);
    });
  }, [clientes, leads, invoices, proposals, calendarEvents, onCompleteEvent]);

  return (
    <div className="metric-card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Hoy · qué hacer
        </p>
        {acciones.length > 0 && (
          <span className="text-[11px] font-semibold text-foreground/70">{acciones.length}</span>
        )}
      </div>

      {acciones.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Todo al día ✓</p>
      ) : (
        <div className="space-y-1.5">
          {acciones.map((a) => {
            const meta = KIND_META[a.kind];
            const Icon = meta.icon;
            return (
              <div
                key={a.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 border transition-colors",
                  a.urgente ? "bg-destructive/[0.06] border-destructive/20" : "bg-white/[0.02] border-border/30",
                )}
              >
                <Icon className={cn("size-4 shrink-0", meta.color)} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-foreground/90 truncate">{a.titulo}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{a.detalle}</p>
                </div>
                {a.kind === "tarea" ? (
                  <button
                    onClick={a.onDone}
                    className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground shrink-0 px-2 py-1 rounded-md hover:bg-white/[0.04]"
                  >
                    <Check className="size-3" /> Listo
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (a.whatsappUrl) window.open(a.whatsappUrl, "_blank");
                      else toast.info(`${a.titulo}: sin teléfono cargado`);
                    }}
                    className={cn(
                      "flex items-center gap-1 text-[10px] font-semibold shrink-0 px-2 py-1 rounded-md transition-colors",
                      a.whatsappUrl
                        ? "text-emerald-400 hover:bg-emerald-400/10"
                        : "text-muted-foreground hover:bg-white/[0.04]",
                    )}
                  >
                    <MessageCircle className="size-3" /> WhatsApp
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
