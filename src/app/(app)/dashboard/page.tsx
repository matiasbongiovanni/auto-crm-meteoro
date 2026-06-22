"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useCrm } from "@/components/crm/provider";
import { SectionCards, type SectionCard } from "@/components/dashboard/SectionCards";
import { MetasPanel } from "@/components/dashboard/MetasPanel";
import { BentoResumen } from "@/components/dashboard/BentoResumen";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { CashCollectWidget } from "@/components/dashboard/CashCollectWidget";
import { AgingBreakdown } from "@/components/dashboard/AgingBreakdown";
import { CentroAcciones } from "@/components/dashboard/CentroAcciones";
import { monthlySubscriptionCost, filterByMonth } from "@/lib/finance";
import { forecastMes } from "@/lib/forecast";
import { totalCobrado, totalPorCobrar, totalVencido, diasARenovacion } from "@/lib/clientes";
import { cn } from "@/lib/utils";

const SCOPE_DAYS: Record<Scope, number> = { "7d": 7, "30d": 30, "90d": 90 };

const SCOPES = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
] as const;

type Scope = "7d" | "30d" | "90d";

export default function DashboardPage() {
  const { state, saveCalendarEvent } = useCrm();
  const [scope, setScope] = useState<Scope>(state.settings.dashboardScope || "30d");
  const [blurred, setBlurred] = useState(state.settings.revenueHiddenByDefault ?? false);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const prevMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  }, []);

  const metrics = useMemo(() => {
    // Scope real: ventana de los últimos N días (7/30/90) sobre ingresos/egresos.
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - SCOPE_DAYS[scope]);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const ingresosScope = state.ingresos.filter((r) => (r.fecha || "") >= cutoffStr);
    const egresosScope = state.egresos.filter((r) => (r.fecha || "") >= cutoffStr);
    const totalIngresos = ingresosScope.reduce((acc, r) => acc + (r.usd || 0), 0);
    const totalEgresos = egresosScope.reduce((acc, r) => acc + (r.usd || 0), 0);
    const netRevenue = totalIngresos - totalEgresos;
    const mrr = monthlySubscriptionCost(state.subscriptions, currentMonth);
    const pendingTotal = state.pendingPayments
      .filter((p) => p.estado !== "cobrado")
      .reduce((acc, p) => acc + (p.monto_usd || 0), 0);
    const pipelineValue = state.pipeline.reduce((acc, c) => acc + (c.value_usd || 0), 0);
    const leadsCaliente = state.leads.filter((l) => l.temperatura === "caliente").length;
    const leadsTibio = state.leads.filter((l) => l.temperatura === "tibio").length;

    // Cash collect del mes calendario
    const cobrado = totalCobrado(state.invoices, currentMonth);
    const porCobrar = totalPorCobrar(state.invoices, currentMonth);
    const vencido = totalVencido(state.invoices);
    const forecast = forecastMes(state.pipeline, state.subscriptions, currentMonth);

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
      cobrado,
      porCobrar,
      vencido,
      forecast,
    };
  }, [state, currentMonth, scope]);

  // KPI hero (patrón shadcn dashboard-01): mes actual vs mes anterior
  const heroCards = useMemo<SectionCard[]>(() => {
    const usd = (n: number) =>
      `USD ${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    const deltaPct = (cur: number, prev: number): number | null =>
      prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : null;

    const netMonth = (m: string) =>
      filterByMonth(state.ingresos, m).reduce((a, r) => a + (r.usd || 0), 0) -
      filterByMonth(state.egresos, m).reduce((a, r) => a + (r.usd || 0), 0);
    const netCur = netMonth(currentMonth);
    const netPrev = netMonth(prevMonth);
    const netDelta = deltaPct(netCur, netPrev);

    const nuevosMes = (m: string) =>
      state.clientes.filter((c) => (c.fecha_alta || "").slice(0, 7) === m).length;
    const nuevosCur = nuevosMes(currentMonth);
    const nuevosPrev = nuevosMes(prevMonth);
    const nuevosDelta = deltaPct(nuevosCur, nuevosPrev);

    const activos = state.clientes.filter((c) => c.status === "activo").length;

    const mrrCur = monthlySubscriptionCost(state.subscriptions, currentMonth);
    const mrrPrev = monthlySubscriptionCost(state.subscriptions, prevMonth);
    const mrrDelta = deltaPct(mrrCur, mrrPrev);

    return [
      {
        label: "Ingresos del mes",
        value: usd(netCur),
        deltaPct: netDelta,
        footerStrong: netDelta !== null && netDelta < 0 ? "Bajando este mes" : "Subiendo este mes",
        footerMuted: "Neto (ingresos − egresos) del mes",
        sensitive: true,
      },
      {
        label: "Clientes nuevos",
        value: String(nuevosCur),
        deltaPct: nuevosDelta,
        footerStrong: nuevosDelta !== null && nuevosDelta < 0 ? "Menos altas que el mes pasado" : "Altas en alza",
        footerMuted: "Nuevos clientes este mes",
      },
      {
        label: "Cuentas activas",
        value: String(activos),
        deltaPct: nuevosCur > 0 ? deltaPct(activos, activos - nuevosCur) : 0,
        footerStrong: "Cartera retenida",
        footerMuted: "Clientes con estado activo",
      },
      {
        label: "MRR",
        value: usd(mrrCur),
        deltaPct: mrrDelta,
        footerStrong: mrrDelta !== null && mrrDelta < 0 ? "MRR en baja" : "MRR en crecimiento",
        footerMuted: "Ingreso recurrente mensual",
        sensitive: true,
      },
    ];
  }, [state, currentMonth, prevMonth]);

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-foreground tracking-[-0.03em]">
            Inicio
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Privacidad de montos */}
          <button
            onClick={() => setBlurred((b) => !b)}
            className="flex items-center gap-1.5 rounded-md border border-border/40 bg-white/[0.02] px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            title={blurred ? "Mostrar montos" : "Ocultar montos"}
          >
            {blurred ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {blurred ? "Mostrar" : "Ocultar"}
          </button>

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
      </div>

      {/* KPI hero — patrón shadcn dashboard-01 */}
      <SectionCards cards={heroCards} blurred={blurred} />

      {/* CEO note — foco del mes */}
      {state.settings.ceoNote && (
        <div className="rounded-lg bg-primary/8 border border-primary/15 px-4 py-3">
          <p className="text-sm text-primary">{state.settings.ceoNote}</p>
        </div>
      )}

      {/* Metas del mes */}
      <MetasPanel
        metas={state.settings.metas}
        state={state}
        month={currentMonth}
        blurMontos={state.settings.revenueHiddenByDefault}
      />

      {/* Prioridades de hoy */}
      <CentroAcciones
        clientes={state.clientes}
        leads={state.leads}
        invoices={state.invoices}
        proposals={state.proposals}
        calendarEvents={state.calendarEvents}
        onCompleteEvent={saveCalendarEvent}
      />

      {/* Bento: Desarrollos · Clientes · Mensualidades activas */}
      <BentoResumen state={state} />

      {/* Separador — detalle financiero */}
      <div className="flex items-center gap-3 pt-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Detalle
        </h3>
        <div className="flex-1 h-px bg-border/40" />
        <span className="text-[10px] text-muted-foreground">ventana {scope}</span>
      </div>

      {/* Revenue chart */}
      <RevenueChart ingresos={state.ingresos} egresos={state.egresos} subscriptions={state.subscriptions} />

      {/* Cobros + Alertas */}
      {(state.clientes.length > 0 || state.invoices.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Cash collect del mes */}
          <CashCollectWidget
            month={currentMonth}
            cobrado={metrics.cobrado}
            porCobrar={metrics.porCobrar}
            vencido={metrics.vencido}
            forecast={metrics.forecast}
            meta={state.settings.monthlyGoalUsd}
            hideGoalAmount={state.settings.hideGoalAmount}
          />

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

      {/* Cartera por antigüedad (aging) */}
      {state.invoices.length > 0 && (
        <AgingBreakdown invoices={state.invoices} clientes={state.clientes} leads={state.leads} />
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
