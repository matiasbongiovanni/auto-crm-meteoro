"use client";

import { useMemo, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, pointerWithin,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Check, Trash2, Plus, CalendarDays, Clock, List } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/crm";
import { TYPE_CONFIG, DAY_NAMES, MONTHS, localToday, toDateStr } from "@/lib/task-config";

type View = "mes" | "semana" | "agenda";

type Props = {
  events: CalendarEvent[];
  onToggle: (e: CalendarEvent) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNewEvent: (date: string) => void;
  onEdit: (e: CalendarEvent) => void;
  onReschedule: (e: CalendarEvent, newDate: string) => Promise<void>;
};

function monthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const grid: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= days; d++) grid.push(d);
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

function weekDays(cursor: Date): string[] {
  const dow = (cursor.getDay() + 6) % 7;
  const monday = new Date(cursor);
  monday.setDate(cursor.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
  });
}

function EventChip({ e, compact }: { e: CalendarEvent; compact?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: e.id, data: { event: e } });
  const tc = TYPE_CONFIG[e.type];
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      className={cn(
        "group/chip flex items-center gap-1 rounded px-1 py-[2px] border text-left truncate cursor-grab active:cursor-grabbing",
        tc.chip, e.completed && "opacity-40 line-through", isDragging && "opacity-0",
        compact ? "text-[10px]" : "text-[11px]",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", tc.dot)} />
      {e.time && <span className="font-mono text-[9px] opacity-70 shrink-0">{e.time}</span>}
      <span className="truncate">{e.title}</span>
    </div>
  );
}

function DroppableDay({ date, children, className, onClick }: {
  date: string; children: React.ReactNode; className?: string; onClick?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  return (
    <div ref={setNodeRef} onClick={onClick}
      className={cn(className, isOver && "ring-2 ring-primary/50 bg-primary/[0.06]")}>
      {children}
    </div>
  );
}

export function CalendarPro({ events, onToggle, onDelete, onNewEvent, onEdit, onReschedule }: Props) {
  const today = localToday();
  const [view, setView] = useState<View>("mes");
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [active, setActive] = useState<CalendarEvent | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const byDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const arr = m.get(e.date) || [];
      arr.push(e);
      m.set(e.date, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
    return m;
  }, [events]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function shift(dir: number) {
    const d = new Date(cursor);
    if (view === "semana") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCursor(d);
  }
  function goToday() { setCursor(new Date()); setSelectedDate(today); }

  function handleStart(e: DragStartEvent) { setActive((e.active.data.current?.event as CalendarEvent) || null); }
  async function handleEnd(e: DragEndEvent) {
    const ev = e.active.data.current?.event as CalendarEvent | undefined;
    const newDate = e.over?.id as string | undefined;
    setActive(null);
    if (!ev || !newDate || newDate === ev.date) return;
    try { await onReschedule(ev, newDate); toast.success(`Movido a ${newDate}`); }
    catch { toast.error("Error al reprogramar"); }
  }

  const grid = monthGrid(year, month);
  const week = weekDays(cursor);
  const selectedEvents = selectedDate ? byDate.get(selectedDate) || [] : [];

  const headerLabel = view === "semana"
    ? `${week[0].slice(8)}–${week[6].slice(8)} ${MONTHS[new Date(week[6]).getMonth()]}`
    : `${MONTHS[month]} ${year}`;

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleStart} onDragEnd={handleEnd}>
      <div className="metric-card rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
          <div className="flex items-center gap-2">
            {view !== "agenda" && (
              <>
                <button onClick={() => shift(-1)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-semibold min-w-[9rem] text-center capitalize">{headerLabel}</p>
                <button onClick={() => shift(1)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button onClick={goToday} className="ml-1 text-[11px] text-primary hover:underline">Hoy</button>
              </>
            )}
            {view === "agenda" && <p className="text-sm font-semibold">Próximos eventos</p>}
          </div>
          {/* View switch */}
          <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5 border border-border/40">
            {([["mes", CalendarDays], ["semana", Clock], ["agenda", List]] as const).map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)}
                className={cn("flex items-center gap-1 px-2 py-1 rounded text-[11px] capitalize transition-colors",
                  view === v ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="h-3 w-3" /> {v}
              </button>
            ))}
          </div>
        </div>

        {/* MES */}
        {view === "mes" && (
          <div className="flex flex-col lg:flex-row">
            <div className="flex-1 p-3">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_NAMES.map((d) => <p key={d} className="text-center text-[10px] text-muted-foreground font-semibold py-1">{d}</p>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {grid.map((day, i) => {
                  if (!day) return <div key={i} className="min-h-[5rem] rounded-md bg-white/[0.01]" />;
                  const ds = toDateStr(year, month, day);
                  const dayEvents = byDate.get(ds) || [];
                  const isToday = ds === today;
                  const isSelected = ds === selectedDate;
                  const hasOverdue = dayEvents.some((e) => !e.completed && ds < today);
                  return (
                    <DroppableDay key={ds} date={ds} onClick={() => setSelectedDate(isSelected ? null : ds)}
                      className={cn(
                        "min-h-[5rem] rounded-md p-1 flex flex-col gap-0.5 cursor-pointer transition-colors border",
                        isSelected ? "border-primary/40 bg-primary/[0.05]" : "border-transparent hover:bg-white/[0.025]",
                        hasOverdue && !isSelected && "bg-destructive/[0.04]",
                      )}>
                      <div className="flex items-center justify-between px-0.5">
                        <span className={cn("text-[11px] leading-none",
                          isToday ? "h-4 w-4 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center" : "text-foreground/60")}>
                          {day}
                        </span>
                        {dayEvents.length > 0 && <span className="text-[8px] text-muted-foreground/60">{dayEvents.length}</span>}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {dayEvents.slice(0, 3).map((e) => <EventChip key={e.id} e={e} compact />)}
                        {dayEvents.length > 3 && <span className="text-[9px] text-muted-foreground/60 px-1">+{dayEvents.length - 3} más</span>}
                      </div>
                    </DroppableDay>
                  );
                })}
              </div>
            </div>
            {selectedDate && (
              <DayPanel date={selectedDate} events={selectedEvents} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} onNewEvent={onNewEvent} />
            )}
          </div>
        )}

        {/* SEMANA */}
        {view === "semana" && (
          <div className="grid grid-cols-7 divide-x divide-border/20">
            {week.map((ds) => {
              const dayEvents = byDate.get(ds) || [];
              const isToday = ds === today;
              const d = new Date(ds);
              return (
                <DroppableDay key={ds} date={ds} className="min-h-[20rem] flex flex-col">
                  <div className={cn("px-2 py-2 border-b border-border/20 text-center", isToday && "bg-primary/[0.06]")}>
                    <p className="text-[10px] text-muted-foreground">{DAY_NAMES[(d.getDay() + 6) % 7]}</p>
                    <p className={cn("text-sm font-semibold", isToday && "text-primary")}>{d.getDate()}</p>
                  </div>
                  <div className="flex-1 p-1.5 flex flex-col gap-1 overflow-y-auto">
                    {dayEvents.map((e) => <EventChip key={e.id} e={e} />)}
                    <button onClick={() => onNewEvent(ds)}
                      className="mt-auto opacity-0 hover:opacity-100 focus:opacity-100 text-[10px] text-muted-foreground hover:text-primary flex items-center justify-center gap-1 py-1 transition-opacity">
                      <Plus className="h-3 w-3" /> Agregar
                    </button>
                  </div>
                </DroppableDay>
              );
            })}
          </div>
        )}

        {/* AGENDA */}
        {view === "agenda" && <AgendaView events={events} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} today={today} />}
      </div>

      <DragOverlay>{active && <div className="scale-105"><EventChip e={active} /></div>}</DragOverlay>
    </DndContext>
  );
}

function DayPanel({ date, events, onToggle, onDelete, onEdit, onNewEvent }: {
  date: string; events: CalendarEvent[];
  onToggle: (e: CalendarEvent) => Promise<void>; onDelete: (id: string) => Promise<void>;
  onEdit: (e: CalendarEvent) => void; onNewEvent: (date: string) => void;
}) {
  return (
    <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-border/20 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/20">
        <p className="text-[12px] font-semibold text-foreground/80 font-mono">{date}</p>
        <button onClick={() => onNewEvent(date)} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
          <Plus className="h-3 w-3" /> Nueva
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[10rem] max-h-[24rem]">
        {events.length === 0 ? (
          <p className="text-[12px] text-muted-foreground text-center py-6">Sin eventos</p>
        ) : events.map((e) => <EventRow key={e.id} e={e} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />)}
      </div>
    </div>
  );
}

function EventRow({ e, onToggle, onDelete, onEdit }: {
  e: CalendarEvent; onToggle: (e: CalendarEvent) => Promise<void>;
  onDelete: (id: string) => Promise<void>; onEdit: (e: CalendarEvent) => void;
}) {
  const tc = TYPE_CONFIG[e.type];
  return (
    <div className={cn("rounded-lg p-2.5 border border-border/20 bg-white/[0.02]", e.completed && "opacity-50")}>
      <div className="flex items-start gap-2">
        <button onClick={() => onToggle(e)}
          className={cn("mt-0.5 h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
            e.completed ? "bg-[var(--success)] border-[var(--success)]" : "border-border/60 hover:border-primary")}>
          {e.completed && <Check className="h-2 w-2 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn("text-[12px] font-medium leading-tight", e.completed && "line-through text-muted-foreground")}>
            {e.time && <span className="font-mono text-[10px] text-muted-foreground mr-1">{e.time}</span>}{e.title}
          </p>
          <span className={cn("inline-block mt-0.5 text-[9px] px-1 py-0.5 rounded border", tc.chip)}>{tc.label}</span>
          {e.company && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{e.company}</p>}
        </div>
        <div className="flex gap-0.5 shrink-0">
          <button onClick={() => onEdit(e)} className="p-0.5 text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3 rotate-45" /></button>
          <button onClick={() => onDelete(e.id)} className="p-0.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
    </div>
  );
}

function AgendaView({ events, onToggle, onDelete, onEdit, today }: {
  events: CalendarEvent[]; onToggle: (e: CalendarEvent) => Promise<void>;
  onDelete: (id: string) => Promise<void>; onEdit: (e: CalendarEvent) => void; today: string;
}) {
  const groups = useMemo(() => {
    const upcoming = events.filter((e) => e.date >= today).sort((a, b) =>
      a.date === b.date ? (a.time || "99").localeCompare(b.time || "99") : a.date.localeCompare(b.date));
    const m = new Map<string, CalendarEvent[]>();
    for (const e of upcoming) { const arr = m.get(e.date) || []; arr.push(e); m.set(e.date, arr); }
    return [...m.entries()].slice(0, 14);
  }, [events, today]);

  if (groups.length === 0) return <p className="text-sm text-muted-foreground text-center py-12">Sin eventos próximos</p>;
  return (
    <div className="p-3 space-y-4 max-h-[32rem] overflow-y-auto">
      {groups.map(([date, evs]) => {
        const d = new Date(date);
        const isToday = date === today;
        return (
          <div key={date} className="flex gap-3">
            <div className="w-14 shrink-0 text-right">
              <p className={cn("text-lg font-bold leading-none", isToday ? "text-primary" : "text-foreground/80")}>{d.getDate()}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{MONTHS[d.getMonth()].slice(0, 3)}</p>
              <p className="text-[9px] text-muted-foreground/60">{DAY_NAMES[(d.getDay() + 6) % 7]}</p>
            </div>
            <div className="flex-1 space-y-1.5 border-l border-border/20 pl-3">
              {evs.map((e) => <EventRow key={e.id} e={e} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
