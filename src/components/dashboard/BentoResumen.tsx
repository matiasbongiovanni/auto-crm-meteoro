"use client";

import Link from "next/link";
import { Hammer, Building2, Repeat } from "lucide-react";
import type { CrmState } from "@/types/crm";
import { diasARenovacion, healthDeCliente } from "@/lib/clientes";
import { formatUsd, CLIENT_HEALTH_CONFIG } from "@/lib/constants";
import { EmpresaLink } from "@/components/shared/EmpresaLink";
import { cn } from "@/lib/utils";

type Props = { state: CrmState };

export function BentoResumen({ state }: Props) {
  const desarrollos = state.pipeline.filter((p) => p.stage === "in_progress");
  const desarrollosValor = desarrollos.reduce((acc, p) => acc + (p.value_usd || 0), 0);

  const clientesActivos = state.clientes.filter((c) => c.status === "activo");
  const recurrentes = clientesActivos.filter((c) => c.billing_cycle !== "unico");

  const proximasRenovaciones = recurrentes
    .map((c) => ({ c, dias: diasARenovacion(c) }))
    .filter((x) => x.dias !== null && x.dias >= 0)
    .sort((a, b) => (a.dias as number) - (b.dias as number))
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Clientes activos — tile grande */}
      <div className="metric-card p-5 lg:col-span-2 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Clientes activos
            </p>
          </div>
          <Link href="/clientes" className="text-[11px] text-muted-foreground hover:text-foreground">Ver →</Link>
        </div>

        <p className="text-3xl font-bold tracking-[-0.03em] text-foreground leading-none mb-4">
          {clientesActivos.length}
        </p>

        {clientesActivos.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Sin clientes activos</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 mt-auto">
            {clientesActivos.slice(0, 6).map((c) => {
              const health = healthDeCliente(c, state.invoices);
              const cfg = CLIENT_HEALTH_CONFIG[health];
              return (
                <div key={c.id} className="flex items-center gap-2 min-w-0">
                  <span className={cn("size-1.5 rounded-full shrink-0", cfg?.dot)} />
                  <EmpresaLink name={c.nombre} className="text-[12px] truncate" muted />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desarrollos activos */}
      <div className="metric-card p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Hammer className="size-4 text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Desarrollos activos
            </p>
          </div>
          <Link href="/pipeline" className="text-[11px] text-muted-foreground hover:text-foreground">Ver →</Link>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-bold tracking-[-0.03em] text-foreground leading-none">
            {desarrollos.length}
          </span>
          {desarrollosValor > 0 && (
            <span className="text-[12px] text-muted-foreground">{formatUsd(desarrollosValor)}</span>
          )}
        </div>

        {desarrollos.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Sin desarrollos en curso</p>
        ) : (
          <div className="space-y-2 mt-auto">
            {desarrollos.slice(0, 3).map((p) => (
              <div key={p.id} className="min-w-0">
                <p className="text-[12px] text-foreground/85 truncate">{p.title}</p>
                <div className="flex items-center justify-between gap-2">
                  <EmpresaLink name={p.company} className="text-[11px] truncate" muted />
                  {p.value_usd ? (
                    <span className="text-[11px] text-muted-foreground shrink-0">{formatUsd(p.value_usd)}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mensualidades activas */}
      <div className="metric-card p-5 flex flex-col lg:col-span-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Repeat className="size-4 text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Mensualidades activas
            </p>
          </div>
          <Link href="/finanzas" className="text-[11px] text-muted-foreground hover:text-foreground">Ver →</Link>
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="text-3xl font-bold tracking-[-0.03em] text-foreground leading-none">{recurrentes.length}</p>
            <p className="text-[11px] text-muted-foreground mt-1">clientes recurrentes</p>
          </div>

          {proximasRenovaciones.length > 0 && (
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Próximas renovaciones</p>
              {proximasRenovaciones.map(({ c, dias }) => (
                <div key={c.id} className="flex items-center justify-between gap-2">
                  <EmpresaLink name={c.nombre} className="text-[12px] truncate" muted />
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {dias === 0 ? "hoy" : `${dias}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
