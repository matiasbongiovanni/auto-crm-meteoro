"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Metrics = {
  netRevenue: number;
  totalIngresos: number;
  totalEgresos: number;
  mrr: number;
  pendingTotal: number;
  pipelineValue: number;
  leadsCaliente: number;
  leadsTibio: number;
  totalLeads: number;
};

type Props = {
  metrics: Metrics;
  monthlyGoal: number;
  defaultHidden?: boolean;
  hideGoalAmount?: boolean;
};

function fmt(n: number, blur: boolean) {
  const s = `USD ${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return blur ? "••••••" : s;
}

function fmtCount(n: number, blur: boolean) {
  if (blur) return "••";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function BusinessMetrics({ metrics, monthlyGoal, defaultHidden, hideGoalAmount }: Props) {
  const [blurred, setBlurred] = useState(defaultHidden ?? false);

  const goal = monthlyGoal || 0;
  const goalPct = goal > 0 ? Math.min((metrics.netRevenue / goal) * 100, 100) : 0;

  const cards = [
    {
      label: "Net Revenue",
      value: fmt(metrics.netRevenue, blurred),
      sub: `+USD ${metrics.totalIngresos.toFixed(0)} ingresos`,
    },
    {
      label: "MRR",
      value: fmt(metrics.mrr, blurred),
      sub: "Suscripciones activas",
    },
    {
      label: "Por cobrar",
      value: fmt(metrics.pendingTotal, blurred),
      sub: "Pagos pendientes",
    },
    {
      label: "Pipeline",
      value: fmt(metrics.pipelineValue, blurred),
      sub: `${fmtCount(metrics.totalLeads, blurred)} leads totales`,
    },
    {
      label: "Leads calientes",
      value: fmtCount(metrics.leadsCaliente, blurred),
      sub: `${fmtCount(metrics.leadsTibio, blurred)} tibios`,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Blur toggle */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setBlurred(!blurred)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {blurred ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          {blurred ? "Mostrar" : "Ocultar"}
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map(({ label, value, sub }) => (
          <div
            key={label}
            className="metric-card px-4 py-4 hover-glow transition-all"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">
              {label}
            </p>
            <p className={cn(
              "text-2xl font-bold tracking-[-0.03em] text-foreground leading-none mb-1",
              blurred && "blur-sm select-none"
            )}>
              {value}
            </p>
            <p className="text-[11px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Goal progress */}
      {goal > 0 && (
        <div className="metric-card px-4 py-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Meta mensual
            </p>
            <span className="text-[11px] text-muted-foreground">
              {hideGoalAmount
                ? `${goalPct.toFixed(0)}%`
                : `${goalPct.toFixed(0)}% · USD ${goal.toLocaleString("es-AR")}`}
            </span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${goalPct}%`,
                background: goalPct >= 100
                  ? "var(--success)"
                  : goalPct >= 50
                    ? "var(--primary)"
                    : "var(--warning)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
