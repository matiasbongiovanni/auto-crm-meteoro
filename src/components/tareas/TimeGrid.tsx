"use client";

import { useMemo, useRef } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/crm";
import { TYPE_CONFIG, DAY_NAMES, localToday } from "@/lib/task-config";
import {
  GRID_HOURS, HOUR_PX, GRID_HEIGHT_PX,
  eventLayout, overlapColumns, offsetToTime, nowOffsetPx, parseHM,
} from "@/lib/calendar-time";

type Props = {
  days: string[]; // 1 (día) o 7 (semana) fechas YYYY-MM-DD
  events: CalendarEvent[];
  onNewSlot: (date: string, time: string) => void;
  onEdit: (e: CalendarEvent) => void;
  onToggle: (e: CalendarEvent) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function EventBlock({ e, col, cols, onEdit, onToggle, onDelete }: {
  e: CalendarEvent; col: number; cols: number;
  onEdit: (e: CalendarEvent) => void;
  onToggle: (e: CalendarEvent) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: e.id, data: { event: e },
  });
  const tc = TYPE_CONFIG[e.type];
  const { topPx, heightPx } = eventLayout(e);
  const widthPct = 100 / cols;
  const style: React.CSSProperties = {
    top: topPx, height: heightPx,
    left: `calc(${col * widthPct}% + 2px)`,
    width: `calc(${widthPct}% - 4px)`,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    borderLeftColor: tc.hex,
  };
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes} style={style}
      onClick={(ev) => { ev.stopPropagation(); onEdit(e); }}
      className={cn(
        "group/blk absolute rounded-md border border-l-2 px-1.5 py-1 overflow-hidden cursor-grab active:cursor-grabbing z-10",
        "bg-card/95 backdrop-blur-sm hover:z-20 hover:shadow-lg transition-shadow",
        e.completed && "opacity-50",
        isDragging && "opacity-60 shadow-xl z-30",
      )}
    >
      <div className="flex items-start gap-1">
        <button
          onClick={(ev) => { ev.stopPropagation(); onToggle(e); }}
          className={cn("mt-px h-3 w-3 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors",
            e.completed ? "bg-[var(--success)] border-[var(--success)]" : "border-border/60 hover:border-primary")}>
          {e.completed && <Check className="h-2 w-2 text-white" />}
        </button>
        <p className={cn("text-[10px] font-semibold leading-tight truncate flex-1", e.completed && "line-through text-muted-foreground")}>
          {e.title}
        </p>
        <button
          onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); }}
          className="opacity-0 group-hover/blk:opacity-100 text-muted-foreground hover:text-destructive shrink-0 transition-opacity">
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>
      {heightPx > 32 && (
        <p className="text-[9px] text-muted-foreground mt-0.5 truncate">
          <span className="font-mono">{e.time}{e.end_time ? `–${e.end_time}` : ""}</span>
          {e.company ? ` · ${e.company}` : ""}
        </p>
      )}
    </div>
  );
}

function DayColumn({ date, events, isToday, onNewSlot, onEdit, onToggle, onDelete }: {
  date: string; events: CalendarEvent[]; isToday: boolean;
  onNewSlot: (date: string, time: string) => void;
  onEdit: (e: CalendarEvent) => void;
  onToggle: (e: CalendarEvent) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `tg:${date}`, data: { date } });
  const colRef = useRef<HTMLDivElement>(null);
  const positioned = useMemo(() => overlapColumns(events), [events]);
  const nowPx = isToday ? nowOffsetPx() : null;

  function handleBgClick(ev: React.MouseEvent<HTMLDivElement>) {
    const rect = colRef.current?.getBoundingClientRect();
    if (!rect) return;
    onNewSlot(date, offsetToTime(ev.clientY - rect.top));
  }

  return (
    <div
      ref={(n) => { setNodeRef(n); colRef.current = n; }}
      onClick={handleBgClick}
      className={cn("relative flex-1 min-w-0 border-r border-border/15 cursor-pointer",
        isOver && "bg-primary/[0.05]")}
      style={{ height: GRID_HEIGHT_PX }}
    >
      {GRID_HOURS.slice(0, -1).map((h) => (
        <div key={h} className="border-b border-border/10" style={{ height: HOUR_PX }} />
      ))}
      {nowPx !== null && (
        <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowPx }}>
          <div className="h-px bg-rose-500/70" />
          <div className="absolute -left-1 -top-[3px] h-1.5 w-1.5 rounded-full bg-rose-500" />
        </div>
      )}
      {positioned.map((e) => (
        <EventBlock key={e.id} e={e} col={e._col} cols={e._cols}
          onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </div>
  );
}

export function TimeGrid({ days, events, onNewSlot, onEdit, onToggle, onDelete }: Props) {
  const today = localToday();
  const byDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const arr = m.get(e.date) || [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return m;
  }, [events]);

  const allDayByDate = (d: string) => (byDate.get(d) || []).filter((e) => parseHM(e.time) === null);
  const timedByDate = (d: string) => (byDate.get(d) || []).filter((e) => parseHM(e.time) !== null);
  const hasAllDay = days.some((d) => allDayByDate(d).length > 0);
  const isWeek = days.length > 1;

  return (
    <div className="flex flex-col max-h-[36rem] overflow-y-auto">
      {/* Encabezado de días (sticky) */}
      <div className="flex sticky top-0 z-30 bg-card border-b border-border/20">
        <div className="w-12 shrink-0" />
        {days.map((d) => {
          const dt = new Date(d + "T00:00:00");
          const isToday = d === today;
          return (
            <div key={d} className={cn("flex-1 text-center py-2", isToday && "bg-primary/[0.06]")}>
              {isWeek && <p className="text-[10px] text-muted-foreground">{DAY_NAMES[(dt.getDay() + 6) % 7]}</p>}
              <p className={cn(isWeek ? "text-sm font-semibold" : "text-[12px] font-semibold",
                isToday ? "text-primary" : "text-foreground/80")}>
                {isWeek ? dt.getDate() : ""}
                {!isWeek && dt.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
          );
        })}
      </div>

      {/* Fila "todo el día" */}
      {hasAllDay && (
        <div className="flex border-b border-border/20 bg-white/[0.01]">
          <div className="w-12 shrink-0 text-right pr-1.5 py-1 text-[9px] text-muted-foreground/60 uppercase">Día</div>
          {days.map((d) => (
            <div key={d} className="flex-1 min-w-0 border-r border-border/15 p-1 flex flex-col gap-1">
              {allDayByDate(d).map((e) => {
                const tc = TYPE_CONFIG[e.type];
                return (
                  <button key={e.id} onClick={() => onEdit(e)}
                    className={cn("text-left rounded px-1.5 py-0.5 border text-[10px] truncate", tc.chip,
                      e.completed && "opacity-50 line-through")}>
                    {e.title}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Grilla horaria */}
      <div className="flex">
        {/* Columna de horas */}
        <div className="w-12 shrink-0">
          {GRID_HOURS.slice(0, -1).map((h) => (
            <div key={h} className="relative text-right pr-1.5" style={{ height: HOUR_PX }}>
              <span className="absolute -top-1.5 right-1.5 text-[9px] text-muted-foreground/60 font-mono">
                {String(h).padStart(2, "0")}:00
              </span>
            </div>
          ))}
        </div>
        {days.map((d) => (
          <DayColumn key={d} date={d} events={timedByDate(d)} isToday={d === today}
            onNewSlot={onNewSlot} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}
