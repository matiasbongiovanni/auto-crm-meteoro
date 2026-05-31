"use client";

import { useState } from "react";
import { TrendingUp, CreditCard, Clock, Kanban, Eye, EyeOff } from "lucide-react";
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
};

function UsdValue({ amount, blur }: { amount: number; blur: boolean }) {
  return (
    <span className={cn("transition-all", blur && "blur-sm select-none")}>
      USD {amount.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
    </span>
  );
}

export function BusinessMetrics({ metrics, monthlyGoal }: Props) {
  const [blurred, setBlurred] = useState(false);

  const goal = monthlyGoal || 0;
  const goalPct = goal > 0 ? Math.min((metrics.netRevenue / goal) * 100, 100) : 0;

  const cards = [
    {
      label: "Net Revenue",
      value: metrics.netRevenue,
      sub: `${metrics.totalIngresos >= 0 ? "+" : ""}USD ${metrics.totalIngresos.toFixed(0)} ingresos`,
      icon: TrendingUp,
      accent: "text-[var(--success)]",
      bg: "bg-[var(--success)]/10",
      isMoney: true,
    },
    {
      label: "MRR",
      value: metrics.mrr,
      sub: "Suscripciones activas",
      icon: CreditCard,
      accent: "text-primary",
      bg: "bg-primary/5",
      isMoney: true,
    },
    {
      label: "Por cobrar",
      value: metrics.pendingTotal,
      sub: "Pagos pendientes",
      icon: Clock,
      accent: "text-[var(--warning)]",
      bg: "bg-[var(--warning)]/10",
      isMoney: true,
    },
    {
      label: "Pipeline",
      value: metrics.pipelineValue,
      sub: `${metrics.totalLeads} leads totales`,
      icon: Kanban,
      accent: "text-[var(--chart-4)]",
      bg: "bg-[var(--chart-4)]/10",
      isMoney: true,
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
          {blurred ? "Mostrar" : "Ocultar"} números
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(({ label, value, sub, icon: Icon, accent, bg, isMoney }) => (
          <div key={label} className="metric-card p-4 hover-glow group">
            <div className="flex items-start justify-between mb-3">
              <p className="label-muted">{label}</p>
              <div className={cn("p-1.5 rounded-md", bg)}>
                <Icon className={cn("h-3.5 w-3.5", accent)} />
              </div>
            </div>
            <p className={cn("text-xl font-bold tracking-[-0.03em] mb-0.5", accent)}>
              {isMoney ? <UsdValue amount={value} blur={blurred} /> : value}
            </p>
            <p className="text-[11px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Goal progress */}
      {goal > 0 && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground/80">Meta mensual</p>
            <span className="text-[11px] text-muted-foreground">
              {goalPct.toFixed(0)}% — USD {goal.toLocaleString("es-AR")}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
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
