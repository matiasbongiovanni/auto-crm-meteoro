"use client";

import { useMemo } from "react";
import { CheckSquare, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { useCrm } from "@/components/crm/provider";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/crm";

const TYPE_LABELS: Record<CalendarEvent["type"], string> = {
  tarea: "Tarea",
  reunion: "Reunión",
  seguimiento: "Seguimiento",
  entrega: "Entrega",
  cobro: "Cobro",
};

export function TaskMetrics() {
  const { state } = useCrm();

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const tom = new Date(now); tom.setDate(tom.getDate() + 1);
    const tomorrowStr = tom.toISOString().slice(0, 10);
    const events = state.calendarEvents;
    const activas = events.filter((e) => !e.completed).length;
    const vencidas = events.filter((e) => !e.completed && e.date < todayStr).length;
    const urgentes = events.filter((e) => !e.completed && (e.date === todayStr || e.date === tomorrowStr)).length;
    const completadas = events.filter((e) => e.completed).length;
    const hoy = events.filter((e) => e.date === todayStr).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    return { activas, vencidas, urgentes, completadas, hoy, todayStr };
  }, [state.calendarEvents]);

  const cards = [
    { label: "Activas", value: stats.activas, icon: CheckSquare, color: "text-foreground/80" },
    { label: "Vencidas", value: stats.vencidas, icon: AlertTriangle, color: stats.vencidas > 0 ? "text-destructive" : "text-muted-foreground/40" },
    { label: "Urgentes", value: stats.urgentes, icon: Clock, color: stats.urgentes > 0 ? "text-[var(--warning)]" : "text-muted-foreground/40" },
    { label: "Completadas", value: stats.completadas, icon: CheckCircle2, color: "text-[var(--success)]" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="metric-card rounded-xl px-4 py-3.5 flex items-center gap-3">
          <Icon className={cn("h-4 w-4 shrink-0", color)} />
          <div>
            <p className="text-xl font-bold text-foreground leading-none">{value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
          </div>
        </div>
      ))}
      {stats.hoy.length > 0 && (
        <div className="metric-card rounded-xl px-4 py-3 col-span-2 md:col-span-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">
            {stats.todayStr} · {stats.hoy.length} evento{stats.hoy.length > 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.hoy.map((e) => (
              <span key={e.id} className={cn(
                "text-[11px] px-2 py-0.5 rounded border",
                e.completed ? "opacity-40" : "opacity-90",
                "bg-white/[0.03] border-border/30 text-foreground/70"
              )}>
                {e.time && <span className="font-mono mr-1.5">{e.time}</span>}
                {TYPE_LABELS[e.type]} — {e.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
