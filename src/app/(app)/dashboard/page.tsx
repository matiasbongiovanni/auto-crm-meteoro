"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCrm } from "@/components/crm/provider";
import { BusinessMetrics } from "@/components/dashboard/BusinessMetrics";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { monthKey, monthlySubscriptionCost, filterByMonth } from "@/lib/finance";
import { totalCobrado, totalPorCobrar, totalVencido, diasARenovacion } from "@/lib/clientes";
import { formatUsd } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SCOPES = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
] as const;

type Scope = "7d" | "30d" | "90d";

export default function DashboardPage() {
  const { state } = useCrm();
  const [scope, setScope] = useState<Scope>(state.settings.dashboardScope || "30d");

  const currentMonth = new Date().toISOString().slice(0, 7);

  const metrics = useMemo(() => {
    const ingresosMes = filterByMonth(state.ingresos, currentMonth);
    const egresosMes = filterByMonth(state.egresos, currentMonth);
    const totalIngresos = ingresosMes.reduce((acc, r) => acc + (r.usd || 0), 0);
    const totalEgresos = egresosMes.reduce((acc, r) => acc + (r.usd || 0), 0);
    const netRevenue = totalIngresos - totalEgresos;
    const mrr = monthlySubscriptionCost(state.subscriptions, currentMonth);
    const pendingTotal = state.pendingPayments
      .filter((p) => p.estado !== "cobrado")
      .reduce((acc, p) => acc + (p.monto_usd || 0), 0);
    const pipelineValue = state.pipeline.reduce((acc, c) => acc + (c.value_usd || 0), 0);
    const leadsCaliente = state.leads.filter((l) => l.temperatura === "caliente").length;
    const leadsTibio = state.leads.filter((l) => l.temperatura === "tibio").length;

    return {
      netRevenue,
      totalIngresos,
      totalEgresos,
      mrr,
      pendingTotal,
      pipelineValue,
      leadsCaliente,
      leadsTibio,
      totalLeads: state.leads.length,
    };
  }, [state, currentMonth]);

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-foreground tracking-[-0.03em]">
            Overview
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Scope selector */}
        <div className="flex items-center bg-white/[0.03] rounded-lg p-0.5 border border-border/30">
          {SCOPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setScope(value)}
              className={cn(
                "px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all",
                scope === value
                  ? "bg-white/[0.07] text-foreground"
                  : "text-muted-foreground hover:text-foreground/70",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* CEO note */}
      {state.settings.ceoNote && (
        <div className="rounded-lg bg-primary/8 border border-primary/15 px-4 py-3">
          <p className="text-sm text-primary">{state.settings.ceoNote}</p>
        </div>
      )}

      {/* Metrics grid */}
      <BusinessMetrics
        metrics={metrics}
        monthlyGoal={state.settings.monthlyGoalUsd}
        defaultHidden={state.settings.revenueHiddenByDefault}
        hideGoalAmount={state.settings.hideGoalAmount}
      />

      {/* Revenue chart */}
      <RevenueChart ingresos={state.ingresos} egresos={state.egresos} subscriptions={state.subscriptions} />

      {/* Cobros + Alertas */}
      {(state.clientes.length > 0 || state.invoices.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Cobros del mes */}
          <div className="metric-card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Cobros {currentMonth}</p>
              <Link href="/finanzas" className="text-[11px] text-muted-foreground hover:text-foreground">Ver →</Link>
            </div>
            <div className="space-y-2">
              {[
                { label: "Cobrado", value: totalCobrado(state.invoices, currentMonth), color: "text-[var(--success)]" },
                { label: "Por cobrar", value: totalPorCobrar(state.invoices, currentMonth), color: "text-[var(--warning)]" },
                { label: "Vencido", value: totalVencido(state.invoices), color: "text-destructive" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">{label}</span>
                  <span className={cn("text-[13px] font-semibold", color)}>{formatUsd(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas de renovación y vencidos */}
          <div className="metric-card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Alertas de cartera</p>
              <Link href="/clientes" className="text-[11px] text-muted-foreground hover:text-foreground">Ver →</Link>
            </div>
            <div className="space-y-2">
              {state.clientes
                .filter((c) => { const d = diasARenovacion(c); return d !== null && d >= 0 && d <= 14; })
                .slice(0, 2)
                .map((c) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <span className="text-[12px] text-muted-foreground truncate">{c.nombre}</span>
                    <span className="text-[11px] font-semibold text-[var(--warning)] ml-2 shrink-0">Renueva en {diasARenovacion(c)}d</span>
                  </div>
                ))}
              {state.invoices.filter((i) => i.status === "vencida").slice(0, 2).map((inv) => {
                const nombre = state.clientes.find((c) => c.id === inv.cliente_id)?.nombre || "—";
                return (
                  <div key={inv.id} className="flex items-center justify-between">
                    <span className="text-[12px] text-muted-foreground truncate">{nombre}</span>
                    <span className="text-[11px] font-semibold text-destructive ml-2 shrink-0">Factura vencida</span>
                  </div>
                );
              })}
              {state.clientes.filter((c) => { const d = diasARenovacion(c); return d !== null && d >= 0 && d <= 14; }).length === 0 &&
               state.invoices.filter((i) => i.status === "vencida").length === 0 && (
                <p className="text-[13px] text-muted-foreground">Sin alertas</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pipeline + Leads summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Leads */}
        <div className="metric-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-4">
            Estado de Leads
          </p>
          <div className="space-y-3">
            {[
              { label: "Calientes", count: metrics.leadsCaliente, bar: "bg-red-400/70" },
              { label: "Tibios", count: metrics.leadsTibio, bar: "bg-orange-400/70" },
              { label: "Total", count: metrics.totalLeads, bar: "bg-white/20" },
            ].map(({ label, count, bar }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-[12px] text-muted-foreground w-16 shrink-0">{label}</span>
                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", bar)}
                    style={{ width: metrics.totalLeads > 0 ? `${(count / metrics.totalLeads) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-[12px] font-semibold text-foreground/80 w-6 text-right shrink-0">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending payments */}
        <div className="metric-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-4">
            Pagos Pendientes
          </p>
          {state.pendingPayments.filter((p) => p.estado !== "cobrado").length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Sin pagos pendientes</p>
          ) : (
            <div className="space-y-3">
              {state.pendingPayments
                .filter((p) => p.estado !== "cobrado")
                .slice(0, 4)
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-[13px] text-foreground/80 truncate">{p.cliente}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{p.concepto}</p>
                    </div>
                    <span className="text-[13px] font-semibold text-[var(--warning)] ml-3 shrink-0">
                      USD {p.monto_usd?.toFixed(0) ?? "—"}
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
