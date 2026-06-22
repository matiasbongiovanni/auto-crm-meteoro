"use client";

import Link from "next/link";
import { Target } from "lucide-react";
import type { CrmState, Meta } from "@/types/crm";
import { progresoMeta, formatMetaValor } from "@/lib/metas";
import { cn } from "@/lib/utils";
import { DolarWidget } from "@/components/dashboard/DolarWidget";

type Props = {
  metas: Meta[];
  state: CrmState;
  month: string;
  blurMontos?: boolean;
};

function barColor(pct: number): string {
  if (pct >= 100) return "var(--success)";
  if (pct >= 50) return "var(--primary)";
  return "var(--warning)";
}

export function MetasPanel({ metas, state, month, blurMontos }: Props) {
  // Cash collect tiene su widget dedicado (CashCollectWidget) más abajo: se excluye acá para no duplicar.
  const metasVisibles = (metas || []).filter((m) => m.tipo !== "cash_collect");

  if (metasVisibles.length === 0) {
    return (
      <div className="space-y-3">
        <div className="metric-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Target className="size-4 text-muted-foreground" />
            <p className="text-[13px] text-muted-foreground">Sin metas configuradas para el mes</p>
          </div>
          <Link href="/admin" className="text-[11px] font-semibold text-foreground/70 hover:text-foreground">
            Configurar metas →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <DolarWidget />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Target className="size-4 text-muted-foreground" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Metas del mes
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {metasVisibles.map((meta) => {
          const { actual, pct } = progresoMeta(meta, state, month);
          const cumplida = pct >= 100;
          const blur = blurMontos && meta.unidad === "usd";
          return (
            <div key={meta.id} className="glow-card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground/90 truncate">{meta.label}</p>
                  {meta.subtitulo && (
                    <p className="text-[11px] text-muted-foreground truncate">{meta.subtitulo}</p>
                  )}
                </div>
                {cumplida && (
                  <span className="text-[10px] font-semibold text-[var(--success)] shrink-0">✓ Cumplida</span>
                )}
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className={cn("text-2xl font-bold tracking-[-0.03em] text-foreground leading-none", blur && "blur-sm select-none")}>
                  {formatMetaValor(actual, meta.unidad)}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  / {formatMetaValor(meta.target, meta.unidad)}
                  {meta.unidad === "cantidad" ? " ventas" : ""}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: barColor(pct) }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</p>
              </div>
            </div>
          );
        })}
        <DolarWidget />
      </div>
    </div>
  );
}
