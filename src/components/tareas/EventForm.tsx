"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventType } from "@/types/crm";
import { defaultEndTime } from "@/lib/calendar-time";

export const TYPE_CONFIG: Record<CalendarEventType, { label: string; color: string }> = {
  tarea: { label: "Tarea", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  reunion: { label: "Reunión", color: "text-sky-400 bg-sky-400/10 border-sky-400/20" },
  seguimiento: { label: "Seguimiento", color: "text-foreground/60 bg-white/5 border-white/10" },
  entrega: { label: "Entrega", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  cobro: { label: "Cobro", color: "text-rose-400 bg-rose-400/10 border-rose-400/20" },
};

export function EventForm({
  initial,
  onSave,
  onClose,
  companies,
}: {
  initial?: Partial<CalendarEvent> & { date?: string; time?: string };
  onSave: (e: CalendarEvent) => Promise<void>;
  onClose: () => void;
  companies: string[];
}) {
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<CalendarEventType>((initial as CalendarEvent)?.type || "tarea");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    const startTime = String(fd.get("time") || "") || undefined;
    let endTime = String(fd.get("end_time") || "") || undefined;
    if (startTime && !endTime) endTime = defaultEndTime(startTime);
    try {
      await onSave({
        id: (initial as CalendarEvent)?.id || crypto.randomUUID(),
        title: String(fd.get("title") || ""),
        date: String(fd.get("date") || new Date().toISOString().slice(0, 10)),
        time: startTime,
        end_time: endTime,
        company: String(fd.get("company") || "") || undefined,
        type,
        completed: (initial as CalendarEvent)?.completed ?? false,
        notes: String(fd.get("notes") || ""),
        created_at: (initial as CalendarEvent)?.created_at || new Date().toISOString(),
      });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="space-y-1">
        <Label className="label-muted">Título</Label>
        <Input name="title" defaultValue={(initial as CalendarEvent)?.title} required className="bg-muted/40 border-border/60" />
      </div>
      <div className="space-y-1">
        <Label className="label-muted">Fecha</Label>
        <Input name="date" type="date" defaultValue={initial?.date || new Date().toISOString().slice(0, 10)} className="bg-muted/40 border-border/60" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="label-muted">Hora inicio</Label>
          <Input name="time" type="time" defaultValue={initial?.time || (initial as CalendarEvent)?.time} className="bg-muted/40 border-border/60" />
        </div>
        <div className="space-y-1">
          <Label className="label-muted">Hora fin</Label>
          <Input name="end_time" type="time" defaultValue={(initial as CalendarEvent)?.end_time} className="bg-muted/40 border-border/60" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="label-muted">Tipo</Label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(TYPE_CONFIG) as CalendarEventType[]).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={cn("px-2.5 py-1 rounded text-[10px] font-semibold border transition-all",
                type === t ? TYPE_CONFIG[t].color : "border-border/40 text-muted-foreground hover:text-foreground")}>
              {TYPE_CONFIG[t].label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <Label className="label-muted">Empresa</Label>
        <Input name="company" list="companies-list" defaultValue={(initial as CalendarEvent)?.company} className="bg-muted/40 border-border/60" />
        <datalist id="companies-list">{companies.map((c) => <option key={c} value={c} />)}</datalist>
      </div>
      <div className="space-y-1">
        <Label className="label-muted">Notas</Label>
        <Textarea name="notes" defaultValue={(initial as CalendarEvent)?.notes} rows={2} className="bg-muted/40 border-border/60 resize-none" />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
