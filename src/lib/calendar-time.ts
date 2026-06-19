import type { CalendarEvent } from "@/types/crm";

// Grilla horaria del calendario (estilo Google Calendar). Rango fijo 08:00–20:00.
export const GRID_START_HOUR = 8;
export const GRID_END_HOUR = 20;
export const HOUR_PX = 56; // alto de cada fila de hora
export const DEFAULT_DURATION_MIN = 60;

export const GRID_HOURS = Array.from(
  { length: GRID_END_HOUR - GRID_START_HOUR + 1 },
  (_, i) => GRID_START_HOUR + i,
);

export const GRID_HEIGHT_PX = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_PX;

/** "HH:MM" → minutos desde 00:00. Devuelve null si no es válido. */
export function parseHM(t?: string): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** minutos desde 00:00 → "HH:MM" */
export function minToHM(min: number): string {
  const m = Math.max(0, Math.min(23 * 60 + 59, Math.round(min)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Hora de fin por default: inicio + 60 min, clampeada al borde de la grilla. */
export function defaultEndTime(start: string): string {
  const s = parseHM(start);
  if (s === null) return start;
  const end = Math.min(s + DEFAULT_DURATION_MIN, GRID_END_HOUR * 60);
  return minToHM(end);
}

const GRID_START_MIN = GRID_START_HOUR * 60;
const GRID_END_MIN = GRID_END_HOUR * 60;

/** Posición vertical de un evento con hora, clampeada al rango visible. */
export function eventLayout(e: CalendarEvent): { topPx: number; heightPx: number } {
  const start = parseHM(e.time) ?? GRID_START_MIN;
  const rawEnd = parseHM(e.end_time) ?? start + DEFAULT_DURATION_MIN;
  const clampedStart = Math.max(GRID_START_MIN, Math.min(start, GRID_END_MIN));
  const clampedEnd = Math.max(clampedStart + 16, Math.min(rawEnd, GRID_END_MIN));
  const topPx = ((clampedStart - GRID_START_MIN) / 60) * HOUR_PX;
  const heightPx = ((clampedEnd - clampedStart) / 60) * HOUR_PX;
  return { topPx, heightPx: Math.max(heightPx, 18) };
}

/** Offset Y (px) en la grilla → "HH:00" snapeado a la hora. */
export function offsetToTime(offsetPx: number): string {
  const minutesFromStart = (offsetPx / HOUR_PX) * 60;
  const total = GRID_START_MIN + minutesFromStart;
  const snappedHour = Math.max(GRID_START_HOUR, Math.min(GRID_END_HOUR - 1, Math.floor(total / 60)));
  return minToHM(snappedHour * 60);
}

/** Línea de "ahora": offset px dentro de la grilla, o null si fuera de rango. */
export function nowOffsetPx(now = new Date()): number | null {
  const min = now.getHours() * 60 + now.getMinutes();
  if (min < GRID_START_MIN || min > GRID_END_MIN) return null;
  return ((min - GRID_START_MIN) / 60) * HOUR_PX;
}

export type PositionedEvent = CalendarEvent & { _col: number; _cols: number };

/**
 * Reparte eventos solapados en sub-columnas horizontales.
 * Algoritmo de "lanes": eventos que se pisan en el tiempo comparten un cluster
 * y se distribuyen en N columnas.
 */
export function overlapColumns(events: CalendarEvent[]): PositionedEvent[] {
  const timed = events
    .filter((e) => parseHM(e.time) !== null)
    .map((e) => {
      const start = parseHM(e.time)!;
      const end = parseHM(e.end_time) ?? start + DEFAULT_DURATION_MIN;
      return { e, start, end: Math.max(end, start + 16) };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const result: PositionedEvent[] = [];
  let cluster: typeof timed = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    // asignar columnas dentro del cluster
    const lanes: number[] = []; // lane index -> end time
    const assigned = cluster.map((item) => {
      let lane = lanes.findIndex((laneEnd) => laneEnd <= item.start);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(item.end);
      } else {
        lanes[lane] = item.end;
      }
      return { item, lane };
    });
    const cols = lanes.length;
    for (const { item, lane } of assigned) {
      result.push({ ...item.e, _col: lane, _cols: cols });
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const item of timed) {
    if (cluster.length > 0 && item.start >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();

  return result;
}
