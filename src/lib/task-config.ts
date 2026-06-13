import type { CalendarEventType } from "@/types/crm";

// Config visual compartida por todo el módulo Tareas (calendario, charts, lista).
// Monocromo con acento semántico sutil por tipo de evento.
export const TYPE_CONFIG: Record<
  CalendarEventType,
  { label: string; chip: string; dot: string; ring: string; hex: string }
> = {
  tarea: {
    label: "Tarea",
    chip: "text-amber-300/90 bg-amber-400/10 border-amber-400/20",
    dot: "bg-amber-400",
    ring: "ring-amber-400/30",
    hex: "#fbbf24",
  },
  reunion: {
    label: "Reunión",
    chip: "text-sky-300/90 bg-sky-400/10 border-sky-400/20",
    dot: "bg-sky-400",
    ring: "ring-sky-400/30",
    hex: "#38bdf8",
  },
  seguimiento: {
    label: "Seguimiento",
    chip: "text-foreground/70 bg-white/5 border-white/10",
    dot: "bg-white/50",
    ring: "ring-white/20",
    hex: "#a1a1aa",
  },
  entrega: {
    label: "Entrega",
    chip: "text-emerald-300/90 bg-emerald-400/10 border-emerald-400/20",
    dot: "bg-emerald-400",
    ring: "ring-emerald-400/30",
    hex: "#34d399",
  },
  cobro: {
    label: "Cobro",
    chip: "text-rose-300/90 bg-rose-400/10 border-rose-400/20",
    dot: "bg-rose-400",
    ring: "ring-rose-400/30",
    hex: "#fb7185",
  },
};

export const TYPE_ORDER: CalendarEventType[] = [
  "tarea",
  "reunion",
  "seguimiento",
  "entrega",
  "cobro",
];

export const DAY_NAMES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
