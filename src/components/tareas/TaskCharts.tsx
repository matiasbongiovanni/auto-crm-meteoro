"use client";

import { useMemo } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Legend,
} from "recharts";
import type { CalendarEvent } from "@/types/crm";
import { TYPE_CONFIG, TYPE_ORDER, localToday } from "@/lib/task-config";
import { cn } from "@/lib/utils";

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name: string; color?: string; payload?: { fill?: string } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs space-y-1">
      {label && <p className="text-muted-foreground font-medium">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color || p.payload?.fill || "var(--foreground)" }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// Anillo de completitud — SVG monocromo animado
function CompletionRing({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const r = 38;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="metric-card p-5 flex flex-col items-center justify-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3 self-start">
        Completitud
      </p>
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
          <circle
            cx="50" cy="50" r={r} fill="none" stroke="var(--foreground)" strokeWidth="7"
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums">{pct}%</span>
          <span className="text-[10px] text-muted-foreground">{done}/{total}</span>
        </div>
      </div>
    </div>
  );
}

export function TaskCharts({ events }: { events: CalendarEvent[] }) {
  const today = localToday();

  const byType = useMemo(() => {
    return TYPE_ORDER.map((t) => ({
      name: TYPE_CONFIG[t].label,
      value: events.filter((e) => e.type === t).length,
      fill: TYPE_CONFIG[t].hex,
    })).filter((d) => d.value > 0);
  }, [events]);

  const last14 = useMemo(() => {
    const days: { label: string; date: string; Creadas: number; Completadas: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({
        label: String(d.getDate()),
        date: ds,
        Creadas: events.filter((e) => (e.created_at || "").slice(0, 10) === ds).length,
        Completadas: events.filter((e) => e.completed && e.date === ds).length,
      });
    }
    return days;
  }, [events]);

  const done = events.filter((e) => e.completed).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
      <CompletionRing done={done} total={events.length} />

      {/* Distribución por tipo */}
      <div className="metric-card p-5 flex flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">
          Por tipo
        </p>
        {byType.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Sin datos</div>
        ) : (
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={byType} dataKey="value" nameKey="name" innerRadius={32} outerRadius={52} paddingAngle={3} stroke="var(--card)" strokeWidth={2}>
                {byType.map((d, i) => <Cell key={i} fill={d.fill} fillOpacity={0.85} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
          {byType.map((d) => (
            <span key={d.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.fill }} />{d.name}
            </span>
          ))}
        </div>
      </div>

      {/* Actividad 14 días */}
      <div className="metric-card p-5 lg:col-span-2 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Actividad · 14 días
          </p>
          <span className="text-[10px] text-muted-foreground font-mono">{today}</span>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={last14} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barGap={2}>
            <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} axisLine={false} tickLine={false} interval={1} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" iconSize={6} />
            <Bar dataKey="Creadas" fill="var(--chart-3)" radius={[2, 2, 0, 0]} maxBarSize={10} />
            <Bar dataKey="Completadas" fill="var(--foreground)" radius={[2, 2, 0, 0]} maxBarSize={10} fillOpacity={0.9} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Heatmap de actividad estilo contribuciones (12 semanas) ────────────────
export function ContributionHeatmap({ events }: { events: CalendarEvent[] }) {
  const weeks = 12;
  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      if (e.completed) counts.set(e.date, (counts.get(e.date) || 0) + 1);
    }
    const today = new Date();
    const dow = (today.getDay() + 6) % 7; // lunes = 0
    const end = new Date(today); end.setDate(end.getDate() + (6 - dow));
    const cols: { date: string; count: number; future: boolean }[][] = [];
    const todayStr = localToday();
    for (let w = weeks - 1; w >= 0; w--) {
      const col: { date: string; count: number; future: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const cell = new Date(end);
        cell.setDate(end.getDate() - (w * 7 + (6 - d)));
        const ds = `${cell.getFullYear()}-${String(cell.getMonth() + 1).padStart(2, "0")}-${String(cell.getDate()).padStart(2, "0")}`;
        col.push({ date: ds, count: counts.get(ds) || 0, future: ds > todayStr });
      }
      cols.push(col);
    }
    return cols;
  }, [events]);

  const level = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4);
  const shades = [
    "rgba(255,255,255,0.04)",
    "rgba(255,255,255,0.18)",
    "rgba(255,255,255,0.36)",
    "rgba(255,255,255,0.62)",
    "rgba(255,255,255,0.92)",
  ];
  const totalDone = events.filter((e) => e.completed).length;

  return (
    <div className="metric-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Racha de completadas
        </p>
        <span className="text-[10px] text-muted-foreground">{totalDone} completadas · 12 sem</span>
      </div>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {data.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((cell, ri) => (
              <div
                key={ri}
                title={`${cell.date}: ${cell.count} completada${cell.count !== 1 ? "s" : ""}`}
                className={cn("h-[11px] w-[11px] rounded-[2px] transition-colors", cell.future && "opacity-30")}
                style={{ background: shades[level(cell.count)] }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[9px] text-muted-foreground">menos</span>
        {shades.map((s, i) => (
          <div key={i} className="h-[10px] w-[10px] rounded-[2px]" style={{ background: s }} />
        ))}
        <span className="text-[9px] text-muted-foreground">más</span>
      </div>
    </div>
  );
}
