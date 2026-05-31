"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { last24Months, filterByMonth, monthlySubscriptionCost } from "@/lib/finance";
import type { FinanceRow, Subscription } from "@/types/crm";

type Props = {
  ingresos: FinanceRow[];
  egresos: FinanceRow[];
  subscriptions: Subscription[];
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg px-3 py-2.5 text-xs space-y-1">
      <p className="text-muted-foreground font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-foreground/70">{p.name}:</span>
          <span className="font-semibold" style={{ color: p.color }}>USD {p.value.toFixed(0)}</span>
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
        const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
        return { month: label, Ingresos: ing, Egresos: egr, MRR: mrr };
      });
  }, [ingresos, egresos, subscriptions]);

  return (
    <div className="metric-card p-5">
      <p className="label-muted mb-4">Revenue últimos 8 meses</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barGap={4} barSize={14}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
          <Bar dataKey="Ingresos" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Egresos" fill="var(--chart-3)" radius={[3, 3, 0, 0]} opacity={0.7} />
          <Bar dataKey="MRR" fill="var(--success)" radius={[3, 3, 0, 0]} opacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
