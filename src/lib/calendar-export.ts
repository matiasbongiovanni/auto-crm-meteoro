import type { CalendarEvent, CalendarEventType } from "@/types/crm";
import { TYPE_CONFIG } from "@/lib/task-config";

// ─── Descarga genérica ──────────────────────────────────────────────────────
function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── ICS (iCalendar — abrible en Google/Apple/Outlook) ──────────────────────
function icsDate(date: string, time?: string): string {
  const [y, m, d] = date.split("-");
  if (time) {
    const [hh, mm] = time.split(":");
    return `${y}${m}${d}T${hh}${mm}00`;
  }
  return `${y}${m}${d}`;
}

function icsEscape(s: string): string {
  return (s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function exportICS(events: CalendarEvent[], filename = "meteoro-calendario.ics") {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Meteoro CRM//Tareas//ES",
    "CALSCALE:GREGORIAN",
  ];
  for (const e of events) {
    const allDay = !e.time;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.id}@meteoro-crm`);
    lines.push(`DTSTAMP:${icsDate(e.date, e.time)}`);
    if (allDay) {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(e.date)}`);
    } else {
      lines.push(`DTSTART:${icsDate(e.date, e.time)}`);
    }
    lines.push(`SUMMARY:${icsEscape(`[${TYPE_CONFIG[e.type].label}] ${e.title}`)}`);
    const desc = [e.company ? `Empresa: ${e.company}` : "", e.notes || ""].filter(Boolean).join("\\n");
    if (desc) lines.push(`DESCRIPTION:${icsEscape(desc)}`);
    lines.push(`STATUS:${e.completed ? "COMPLETED" : "CONFIRMED"}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  download(filename, lines.join("\r\n"), "text/calendar;charset=utf-8");
}

// ─── CSV ────────────────────────────────────────────────────────────────────
function csvCell(v: string | undefined | null): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCSV(events: CalendarEvent[], filename = "meteoro-tareas.csv") {
  const headers = ["fecha", "hora", "tipo", "titulo", "empresa", "completado", "notas"];
  const rows = events.map((e) =>
    [e.date, e.time || "", e.type, e.title, e.company || "", e.completed ? "si" : "no", e.notes || ""]
      .map(csvCell)
      .join(",")
  );
  download(filename, "﻿" + [headers.join(","), ...rows].join("\n"), "text/csv;charset=utf-8");
}

export function exportJSON(events: CalendarEvent[], filename = "meteoro-tareas.json") {
  download(filename, JSON.stringify(events, null, 2), "application/json");
}

// ─── Import (CSV o JSON) ────────────────────────────────────────────────────
const VALID_TYPES: CalendarEventType[] = ["tarea", "reunion", "seguimiento", "entrega", "cobro"];

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function normalize(raw: Record<string, string>): CalendarEvent | null {
  const title = (raw.titulo || raw.title || "").trim();
  const date = (raw.fecha || raw.date || "").trim();
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const type = (raw.tipo || raw.type || "tarea").trim() as CalendarEventType;
  return {
    id: crypto.randomUUID(),
    title,
    date,
    time: (raw.hora || raw.time || "").trim() || undefined,
    company: (raw.empresa || raw.company || "").trim() || undefined,
    type: VALID_TYPES.includes(type) ? type : "tarea",
    completed: /^(si|sí|true|1|yes)$/i.test((raw.completado || raw.completed || "").trim()),
    notes: (raw.notas || raw.notes || "").trim(),
    created_at: new Date().toISOString(),
  };
}

export function parseImport(text: string): { events: CalendarEvent[]; errors: number } {
  text = text.trim();
  let errors = 0;
  // JSON
  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      const arr = JSON.parse(text);
      const list = Array.isArray(arr) ? arr : [arr];
      const events: CalendarEvent[] = [];
      for (const item of list) {
        const ev = normalize(item);
        if (ev) events.push(ev); else errors++;
      }
      return { events, errors };
    } catch {
      return { events: [], errors: 1 };
    }
  }
  // CSV
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { events: [], errors: 1 };
  const headers = parseCSVLine(lines[0].replace(/^﻿/, "")).map((h) => h.trim().toLowerCase());
  const events: CalendarEvent[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => (raw[h] = cells[idx] ?? ""));
    const ev = normalize(raw);
    if (ev) events.push(ev); else errors++;
  }
  return { events, errors };
}
