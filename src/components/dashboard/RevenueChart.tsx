"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { last24Months, filterByMonth, monthlySubscriptionCost } from "@/lib/finance";
import type { FinanceRow, Subscription } from "@/types/crm";

type Props = {
  ingresos: FinanceRow[];
  egresos: FinanceRow[];
  subscriptions: Subscription[];
};

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg px-3 py-2.5 text-xs space-y-1">
      <p className="text-muted-foreground font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">USD {p.value.toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart({ ingresos, egresos, subscriptions }: Props) {
  const data = useMemo(() => {
    return last24Months()
      .slice(0, 8)
      .reverse()
      .map((month) => {
        const ing = filterByMonth(ingresos, month).reduce((acc, r) => acc + (r.usd || 0), 0);
        const egr = filterByMonth(egresos, month).reduce((acc, r) => acc + (r.usd || 0), 0);
        const mrr = monthlySubscriptionCost(subscriptions, month);
        const [y, m] = month.split("-");
        const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("es-AR", {
          month: "short",
          year: "2-digit",
        });
        return { month: label, Ingresos: ing, Egresos: egr, MRR: mrr };
      });
  }, [ingresos, egresos, subscriptions]);

  return (
    <div className="metric-card p-5">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Revenue · últimos 8 meses
        </p>
        <div className="flex items-center gap-4">
          {[
            { label: "Ingresos", color: "var(--foreground)" },
            { label: "MRR", color: "var(--success)" },
            { label: "Egresos", color: "var(--chart-3)" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2 h-0.5 rounded-full" style={{ background: color }} />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.12} />
              <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradMRR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--success)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradEgresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.1} />
              <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="Ingresos"
            stroke="var(--foreground)"
            strokeWidth={1.5}
            fill="url(#gradIngresos)"
            dot={false}
            activeDot={{ r: 3, fill: "var(--foreground)", strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="MRR"
            stroke="var(--success)"
            strokeWidth={1.5}
            fill="url(#gradMRR)"
            dot={false}
            activeDot={{ r: 3, fill: "var(--success)", strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="Egresos"
            stroke="var(--chart-3)"
            strokeWidth={1.5}
            fill="url(#gradEgresos)"
            dot={false}
            activeDot={{ r: 3, fill: "var(--chart-3)", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
