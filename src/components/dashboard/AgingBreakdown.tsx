"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import type { Invoice, Cliente } from "@/types/crm";
import { agingBuckets, carteraAbierta, proximaAccion } from "@/lib/cobranzas";
import { formatUsd } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  invoices: Invoice[];
  clientes: Cliente[];
  onRecordar?: (invoice: Invoice) => void;
};

const BUCKETS: { key: "corriente" | "b0_7" | "b8_30" | "b30plus"; label: string; color: string }[] = [
  { key: "corriente", label: "Corriente", color: "text-muted-foreground" },
  { key: "b0_7", label: "1-7 días", color: "text-[var(--warning)]" },
  { key: "b8_30", label: "8-30 días", color: "text-orange-400" },
  { key: "b30plus", label: "31+ días", color: "text-destructive" },
];

export function AgingBreakdown({ invoices, clientes, onRecordar }: Props) {
  const aging = useMemo(() => agingBuckets(invoices), [invoices]);
  const cartera = useMemo(() => carteraAbierta(invoices).slice(0, 5), [invoices]);

  const nombreDe = (id: string) => clientes.find((c) => c.id === id)?.nombre || "—";

  if (aging.total === 0) {
    return (
      <div className="metric-card p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-4">
          Cartera por antigüedad
        </p>
        <p className="text-[13px] text-muted-foreground">Sin facturas abiertas</p>
      </div>
    );
  }

  return (
    <div className="metric-card p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-4">
        Cartera por antigüedad
      </p>

      {/* Buckets */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {BUCKETS.map(({ key, label, color }) => (
          <div key={key}>
            <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
            <p className={cn("text-[12px] font-semibold", color)}>{formatUsd(aging[key])}</p>
          </div>
        ))}
      </div>

      {/* Facturas más urgentes */}
      <div className="space-y-2 pt-3 border-t border-border/30">
        {cartera.map(({ invoice, mora }) => (
          <div key={invoice.id} className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[12px] text-foreground/80 truncate">{nombreDe(invoice.cliente_id)}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {formatUsd(invoice.monto_usd)} · {mora > 0 ? `${mora}d mora` : "por vencer"} · {proximaAccion(mora)}
              </p>
            </div>
            {mora > 0 && (
              <button
                onClick={() => {
                  if (onRecordar) onRecordar(invoice);
                  else toast.info("Recordatorio: configurá el canal de WhatsApp");
                }}
                className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground shrink-0 px-2 py-1 rounded-md hover:bg-white/[0.04] transition-colors"
              >
                <Bell className="size-3" />
                Recordar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
