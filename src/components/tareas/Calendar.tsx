"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventType } from "@/types/crm";

const TYPE_CONFIG: Record<CalendarEventType, { label: string; color: string; dot: string }> = {
  tarea: { label: "Tarea", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", dot: "bg-amber-400" },
  reunion: { label: "Reunión", color: "text-sky-400 bg-sky-400/10 border-sky-400/20", dot: "bg-sky-400" },
  seguimiento: { label: "Seguimiento", color: "text-foreground/60 bg-white/5 border-white/10", dot: "bg-white/40" },
  entrega: { label: "Entrega", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" },
  cobro: { label: "Cobro", color: "text-rose-400 bg-rose-400/10 border-rose-400/20", dot: "bg-rose-400" },
};

const DAY_NAMES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function buildCalendarGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const grid: (number | null)[] = [];
  for (let i = 0; i < offset; i++) grid.push(null);
  for (let d = 1; d <= days; d++) grid.push(d);
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

type Props = {
  events: CalendarEvent[];
  onToggle: (e: CalendarEvent) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNewEvent: (date: string) => void;
  onEdit: (e: CalendarEvent) => void;
};

export function CalendarView({ events, onToggle, onDelete, onNewEvent, onEdit }: Props) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const grid = buildCalendarGrid(year, month);

  function goToToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(todayStr);
  }

  function prevM() { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); }
  function nextM() { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); }

  const selectedEvents = selectedDate
    ? events.filter((e) => e.date === selectedDate).sort((a, b) => (a.time || "").localeCompare(b.time || ""))
    : [];

  return (
    <div className="metric-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
        <div className="flex items-center gap-2">
          <button onClick={prevM} className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold w-36 text-center">{MONTHS[month]} {year}</p>
          <button onClick={nextM} className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button onClick={goToToday} className="text-[11px] text-primary hover:underline">Hoy</button>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Grid */}
        <div className="flex-1 p-3">
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAY_NAMES.map((d) => (
              <p key={d} className="text-center text-[10px] text-muted-foreground font-semibold py-1">{d}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {grid.map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr = toDateStr(year, month, day);
              const dayEvents = events.filter((e) => e.date === dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const hasPast = dayEvents.some((e) => !e.completed && e.date < todayStr);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={cn(
                    "relative flex flex-col items-center p-1 rounded-md text-center text-[12px] transition-colors min-h-[3rem]",
                    isSelected ? "bg-primary/10 ring-1 ring-primary/30" :
                    isToday ? "bg-white/[0.05]" : "hover:bg-white/[0.03]",
                    isToday ? "text-primary font-bold" : "text-foreground/70",
                    hasPast && !isSelected && "bg-destructive/5",
                  )}
                >
                  <span className="leading-none mb-1">{day}</span>
                  {/* Event chips (max 2 + overflow) */}
                  <div className="w-full space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div
                        key={e.id}
                        className={cn(
                          "w-full h-1 rounded-full",
                          TYPE_CONFIG[e.type].dot,
                          e.completed && "opacity-30",
                        )}
                      />
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-[8px] text-muted-foreground/60 leading-none">+{dayEvents.length - 2}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day panel */}
        {selectedDate && (
          <div className="md:w-64 border-t md:border-t-0 md:border-l border-border/20 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
              <p className="text-[12px] font-semibold text-foreground/80">{selectedDate}</p>
              <button
                onClick={() => onNewEvent(selectedDate)}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> Nueva
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[8rem] max-h-72">
              {selectedEvents.length === 0 ? (
                <p className="text-[12px] text-muted-foreground text-center py-4">Sin eventos</p>
              ) : selectedEvents.map((e) => {
                const tc = TYPE_CONFIG[e.type];
                return (
                  <div key={e.id} className={cn("rounded-lg p-2.5 border border-border/20 bg-white/[0.02]", e.completed && "opacity-50")}>
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => onToggle(e)}
                        className={cn(
                          "mt-0.5 h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                          e.completed ? "bg-[var(--success)] border-[var(--success)]" : "border-border/60 hover:border-primary",
                        )}
                      >
                        {e.completed && <Check className="h-2 w-2 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[12px] font-medium leading-tight", e.completed && "line-through text-muted-foreground")}>
                          {e.time && <span className="font-mono text-[10px] text-muted-foreground mr-1">{e.time}</span>}
                          {e.title}
                        </p>
                        <span className={cn("inline-block mt-0.5 text-[9px] px-1 py-0.5 rounded border", tc.color)}>
                          {tc.label}
                        </span>
                        {e.company && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{e.company}</p>}
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <button onClick={() => onEdit(e)} className="p-0.5 text-muted-foreground hover:text-foreground">
                          <Plus className="h-3 w-3 rotate-45" />
                        </button>
                        <button onClick={() => onDelete(e.id)} className="p-0.5 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
