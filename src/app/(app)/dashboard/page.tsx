"use client";

import { useMemo, useState } from "react";
import { useCrm } from "@/components/crm/provider";
import { BusinessMetrics } from "@/components/dashboard/BusinessMetrics";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { monthKey, monthlySubscriptionCost, filterByMonth } from "@/lib/finance";
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
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-heading text-xl font-bold text-foreground tracking-[-0.03em]">
            Overview
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Scope selector */}
        <div className="flex items-center bg-muted/30 rounded-lg p-0.5 border border-border/40">
          {SCOPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setScope(value)}
              className={cn(
                "px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all",
                scope === value
                  ? "bg-primary/8 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
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
      <BusinessMetrics metrics={metrics} monthlyGoal={state.settings.monthlyGoalUsd} />

      {/* Revenue chart */}
      <RevenueChart ingresos={state.ingresos} egresos={state.egresos} subscriptions={state.subscriptions} />

      {/* Pipeline + Leads summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Leads */}
        <div className="metric-card p-5">
          <p className="label-muted mb-3">Estado de Leads</p>
          <div className="space-y-2">
            {[
              { label: "Calientes", count: metrics.leadsCaliente, color: "bg-red-400" },
              { label: "Tibios", count: metrics.leadsTibio, color: "bg-orange-400" },
              { label: "Total", count: metrics.totalLeads, color: "bg-primary" },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("status-dot", color)} />
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>
                <span className="text-sm font-semibold text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending payments */}
        <div className="metric-card p-5">
          <p className="label-muted mb-3">Pagos Pendientes</p>
          {state.pendingPayments.filter((p) => p.estado !== "cobrado").length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pagos pendientes</p>
          ) : (
            <div className="space-y-2">
              {state.pendingPayments
                .filter((p) => p.estado !== "cobrado")
                .slice(0, 4)
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground/80 truncate">{p.cliente}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{p.concepto}</p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--warning)] ml-3 shrink-0">
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
