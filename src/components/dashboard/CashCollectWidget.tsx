"use client";

import Link from "next/link";
import { formatUsd } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  month: string;
  cobrado: number;
  porCobrar: number;
  vencido: number;
  forecast: number;
  meta: number;
  hideGoalAmount?: boolean;
};

export function CashCollectWidget({
  month,
  cobrado,
  porCobrar,
  vencido,
  forecast,
  meta,
  hideGoalAmount,
}: Props) {
  const pct = meta > 0 ? Math.min(100, Math.round((cobrado / meta) * 100)) : 0;
  const falta = Math.max(0, meta - cobrado);

  const stats = [
    { label: "Por cobrar", value: porCobrar, color: "text-[var(--warning)]" },
    { label: "Vencido", value: vencido, color: "text-destructive" },
    { label: "Forecast mes", value: forecast, color: "text-[var(--success)]" },
  ];

  return (
    <div className="metric-card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Cash collect · {month}
        </p>
        <Link href="/finanzas" className="text-[11px] text-muted-foreground hover:text-foreground">
          Ver →
        </Link>
      </div>

      {/* Cobrado vs meta */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[22px] font-bold text-foreground tracking-[-0.03em]">
            {formatUsd(cobrado)}
          </span>
          {meta > 0 && !hideGoalAmount && (
            <span className="text-[12px] text-muted-foreground">
              de {formatUsd(meta)} · {pct}%
            </span>
          )}
        </div>
        {meta > 0 && (
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                pct >= 100 ? "bg-[var(--success)]" : "bg-primary",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        {meta > 0 && !hideGoalAmount && falta > 0 && (
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Faltan {formatUsd(falta)} para la meta
          </p>
        )}
      </div>

      {/* Stats secundarios */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/30">
        {stats.map(({ label, value, color }) => (
          <div key={label}>
            <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
            <p className={cn("text-[13px] font-semibold", color)}>{formatUsd(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
