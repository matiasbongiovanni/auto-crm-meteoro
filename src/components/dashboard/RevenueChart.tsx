"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { last24Months, filterByMonth, monthlySubscriptionCost } from "@/lib/finance";
import type { FinanceRow, Subscription } from "@/types/crm";
import { cn } from "@/lib/utils";

type Props = {
  ingresos: FinanceRow[];
  egresos: FinanceRow[];
  subscriptions: Subscription[];
};

const RANGES = [
  { value: 12, label: "12 meses" },
  { value: 6, label: "6 meses" },
  { value: 3, label: "3 meses" },
] as const;

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
  const [range, setRange] = useState<number>(12);

  const data = useMemo(() => {
    return last24Months()
      .slice(0, range)
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
  }, [ingresos, egresos, subscriptions, range]);

  return (
    <Card>
      <CardHeader className="border-b [.border-b]:pb-4">
        <CardDescription>Total de los últimos {range} meses</CardDescription>
        <CardTitle className="text-base">Ingresos & MRR</CardTitle>
        <CardAction>
          <div className="inline-flex items-center rounded-lg border border-border/50 bg-white/[0.02] p-0.5">
            {RANGES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setRange(value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                  range === value
                    ? "bg-white/[0.08] text-foreground"
                    : "text-muted-foreground hover:text-foreground/70",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.22} />
                <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradMRR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--success)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradEgresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.12} />
                <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }} />
            <Area type="monotone" dataKey="Ingresos" stroke="var(--foreground)" strokeWidth={2} fill="url(#gradIngresos)" dot={false} activeDot={{ r: 3, fill: "var(--foreground)", strokeWidth: 0 }} />
            <Area type="monotone" dataKey="MRR" stroke="var(--success)" strokeWidth={1.5} fill="url(#gradMRR)" dot={false} activeDot={{ r: 3, fill: "var(--success)", strokeWidth: 0 }} />
            <Area type="monotone" dataKey="Egresos" stroke="var(--chart-3)" strokeWidth={1.5} fill="url(#gradEgresos)" dot={false} activeDot={{ r: 3, fill: "var(--chart-3)", strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
