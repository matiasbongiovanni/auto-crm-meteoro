"use client";

import { useMemo, useState } from "react";
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
import { totalCobrado, totalPorCobrar, totalVencido } from "@/lib/clientes";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { state, saveCalendarEvent } = useCrm();
  const [blurred, setBlurred] = useState(state.settings.revenueHiddenByDefault ?? false);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const prevMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  }, []);

  // Meta de cash collect: fuente única = la meta tipo cash_collect (fallback al legacy monthlyGoalUsd)
  const cashGoal = useMemo(() => {
    const meta = state.settings.metas?.find((m) => m.tipo === "cash_collect");
    return meta?.target ?? state.settings.monthlyGoalUsd ?? 0;
  }, [state.settings.metas, state.settings.monthlyGoalUsd]);

  const metrics = useMemo(() => {
    const leadsCaliente = state.leads.filter((l) => l.temperatura === "caliente").length;
    const leadsTibio = state.leads.filter((l) => l.temperatura === "tibio").length;

    // Cash collect del mes calendario
    const cobrado = totalCobrado(state.invoices, currentMonth);
    const porCobrar = totalPorCobrar(state.invoices, currentMonth);
    const vencido = totalVencido(state.invoices);
    const forecast = forecastMes(state.pipeline, state.subscriptions, currentMonth);

    return {
      leadsCaliente,
      leadsTibio,
      totalLeads: state.leads.length,
      cobrado,
      porCobrar,
      vencido,
      forecast,
    };
  }, [state, currentMonth]);

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

    const mrrCur = monthlySubscriptionCost(state.subscriptions, currentMonth);
    const mrrPrev = monthlySubscriptionCost(state.subscriptions, prevMonth);
    const mrrDelta = deltaPct(mrrCur, mrrPrev);

    // Pipeline: valor de oportunidades abiertas (sin cerradas)
    const pipelineValue = state.pipeline
      .filter((c) => c.stage !== "closed")
      .reduce((acc, c) => acc + (c.value_usd || 0), 0);
    const pipelineCount = state.pipeline.filter((c) => c.stage !== "closed").length;

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
        label: "MRR",
        value: usd(mrrCur),
        deltaPct: mrrDelta,
        footerStrong: mrrDelta !== null && mrrDelta < 0 ? "MRR en baja" : "MRR en crecimiento",
        footerMuted: "Ingreso recurrente mensual",
        sensitive: true,
      },
      {
        label: "Pipeline",
        value: usd(pipelineValue),
        deltaPct: null,
        footerStrong: `${pipelineCount} oportunidades abiertas`,
        footerMuted: "Valor estimado en negociación",
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

        {/* Privacidad de montos */}
        <button
          onClick={() => setBlurred((b) => !b)}
          className="flex items-center gap-1.5 rounded-md border border-border/40 bg-white/[0.02] px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          title={blurred ? "Mostrar montos" : "Ocultar montos"}
        >
          {blurred ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {blurred ? "Mostrar" : "Ocultar"}
        </button>
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
          Finanzas
        </h3>
        <div className="flex-1 h-px bg-border/40" />
      </div>

      {/* Revenue chart */}
      <RevenueChart ingresos={state.ingresos} egresos={state.egresos} subscriptions={state.subscriptions} />

      {/* Cobranzas: cash collect del mes + cartera por antigüedad */}
      {(state.clientes.length > 0 || state.invoices.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CashCollectWidget
            month={currentMonth}
            cobrado={metrics.cobrado}
            porCobrar={metrics.porCobrar}
            vencido={metrics.vencido}
            forecast={metrics.forecast}
            meta={cashGoal}
            hideGoalAmount={state.settings.hideGoalAmount || blurred}
          />
          {state.invoices.length > 0 && (
            <AgingBreakdown invoices={state.invoices} clientes={state.clientes} leads={state.leads} />
          )}
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
