"use client";

import { useMemo } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useCrm } from "@/components/crm/provider";
import { filterByMonth, monthlySubscriptionCost, prevMonth, last24Months } from "@/lib/finance";
import { cn } from "@/lib/utils";

function pctDiff(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

export function FinanceMetrics() {
  const { state } = useCrm();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const prev = prevMonth(currentMonth);

  const stats = useMemo(() => {
    const ingCurr = filterByMonth(state.ingresos, currentMonth).reduce((a, r) => a + (r.usd || 0), 0);
    const egrCurr = filterByMonth(state.egresos, currentMonth).reduce((a, r) => a + (r.usd || 0), 0);
    const netCurr = ingCurr - egrCurr;

    const ingPrev = filterByMonth(state.ingresos, prev).reduce((a, r) => a + (r.usd || 0), 0);
    const egrPrev = filterByMonth(state.egresos, prev).reduce((a, r) => a + (r.usd || 0), 0);
    const netPrev = ingPrev - egrPrev;

    const mrr = monthlySubscriptionCost(state.subscriptions, currentMonth);
    const annualProjection = mrr * 12;

    const cobrado = filterByMonth(state.ingresos, currentMonth).reduce((a, r) => a + (r.usd || 0), 0);
    const porCobrar = state.pendingPayments
      .filter((p) => p.estado !== "cobrado")
      .reduce((a, p) => a + (p.monto_usd || 0), 0);

    // Top 5 clientes por ingresos totales
    const byCliente: Record<string, number> = {};
    for (const r of state.ingresos) {
      const name = r.persona || "Sin asignar";
      byCliente[name] = (byCliente[name] || 0) + (r.usd || 0);
    }
    const topClientes = Object.entries(byCliente)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Ingresos por categoría (mes actual)
    const byCat: Record<string, number> = {};
    for (const r of filterByMonth(state.ingresos, currentMonth)) {
      const cat = r.flow_kind || "otro";
      byCat[cat] = (byCat[cat] || 0) + (r.usd || 0);
    }

    // Ticket promedio
    const ingresosMes = filterByMonth(state.ingresos, currentMonth);
    const ticket = ingresosMes.length > 0 ? ingCurr / ingresosMes.length : 0;

    // YTD acumulado
    const year = currentMonth.slice(0, 4);
    const ytd = state.ingresos
      .filter((r) => (r.period_month || r.fecha).startsWith(year))
      .reduce((a, r) => a + (r.usd || 0), 0);

    return { ingCurr, egrCurr, netCurr, ingPrev, netPrev, mrr, annualProjection, cobrado, porCobrar, topClientes, byCat, ticket, ytd };
  }, [state, currentMonth, prev]);

  // Chart data: last 6 months
  const chartData = useMemo(() => {
    return last24Months().slice(0, 6).reverse().map((m) => {
      const ing = filterByMonth(state.ingresos, m).reduce((a, r) => a + (r.usd || 0), 0);
      const egr = filterByMonth(state.egresos, m).reduce((a, r) => a + (r.usd || 0), 0);
      return { mes: m.slice(5), ing, egr, net: ing - egr };
    });
  }, [state.ingresos, state.egresos]);

  const netPctChange = pctDiff(stats.netCurr, stats.netPrev);
  const netUp = netPctChange >= 0;

  return (
    <div className="space-y-3 mb-4">
      {/* Top row: key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Neto mes"
          value={`USD ${stats.netCurr.toFixed(0)}`}
          sub={
            <span className={cn("flex items-center gap-0.5 text-[10px]", netUp ? "text-[var(--success)]" : "text-destructive")}>
              {netUp ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
              {Math.abs(netPctChange).toFixed(0)}% vs mes ant.
            </span>
          }
        />
        <MetricCard
          label="MRR"
          value={`USD ${stats.mrr.toFixed(0)}`}
          sub={<span className="text-[10px] text-muted-foreground">Proyección: USD {stats.annualProjection.toFixed(0)}/año</span>}
        />
        <MetricCard
          label="Cobrado hoy"
          value={`USD ${stats.cobrado.toFixed(0)}`}
          sub={<span className="text-[10px] text-[var(--warning)]">USD {stats.porCobrar.toFixed(0)} por cobrar</span>}
        />
        <MetricCard
          label="Ticket promedio"
          value={`USD ${stats.ticket.toFixed(0)}`}
          sub={<span className="text-[10px] text-muted-foreground">YTD: USD {stats.ytd.toFixed(0)}</span>}
        />
      </div>

      {/* Chart + side panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Evolution chart */}
        <div className="metric-card rounded-xl p-4 md:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3">
            Evolución 6 meses
          </p>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradIng" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--success)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="mes" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
                formatter={(v, name) => [`USD ${Number(v ?? 0).toFixed(0)}`, name === "ing" ? "Ing." : name === "egr" ? "Egr." : "Neto"]}
              />
              <Area type="monotone" dataKey="ing" stroke="var(--success)" strokeWidth={1.5} fill="url(#gradIng)" dot={false} />
              <Area type="monotone" dataKey="net" stroke="var(--primary)" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="3 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top clientes */}
        <div className="metric-card rounded-xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3">
            Top clientes
          </p>
          <div className="space-y-2">
            {stats.topClientes.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">Sin datos</p>
            ) : stats.topClientes.map(([name, amount]) => (
              <div key={name} className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-foreground/70 truncate">{name}</span>
                <span className="text-[12px] font-semibold text-foreground/80 shrink-0">USD {amount.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      {Object.keys(stats.byCat).length > 0 && (
        <div className="metric-card rounded-xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3">
            Ingresos por categoría (mes actual)
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byCat).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
              <div key={cat} className="flex items-center gap-1.5 bg-white/[0.03] border border-border/20 rounded-lg px-2.5 py-1.5">
                <span className="text-[11px] text-muted-foreground capitalize">{cat}</span>
                <span className="text-[12px] font-semibold text-foreground/80">USD {amount.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: React.ReactNode }) {
  return (
    <div className="metric-card rounded-xl px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold text-foreground tracking-tight leading-none mb-1">{value}</p>
      {sub}
    </div>
  );
}
