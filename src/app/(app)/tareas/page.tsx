"use client";

import { useState } from "react";
import { Plus, Check, Trash2, Building2 } from "lucide-react";
import { useCrm } from "@/components/crm/provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventType, CompanyNote } from "@/types/crm";
import { TaskMetrics } from "@/components/tareas/TaskMetrics";
import { CalendarPro } from "@/components/tareas/CalendarPro";
import { TaskCharts, ContributionHeatmap } from "@/components/tareas/TaskCharts";
import { TaskToolbar } from "@/components/tareas/TaskToolbar";

const TYPE_CONFIG: Record<CalendarEventType, { label: string; color: string }> = {
  tarea: { label: "Tarea", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  reunion: { label: "Reunión", color: "text-sky-400 bg-sky-400/10 border-sky-400/20" },
  seguimiento: { label: "Seguimiento", color: "text-foreground/60 bg-white/5 border-white/10" },
  entrega: { label: "Entrega", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  cobro: { label: "Cobro", color: "text-rose-400 bg-rose-400/10 border-rose-400/20" },
};

function EventForm({ initial, onSave, onClose, companies }: {
  initial?: Partial<CalendarEvent> & { date?: string };
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
    try {
      await onSave({
        id: (initial as CalendarEvent)?.id || crypto.randomUUID(),
        title: String(fd.get("title") || ""),
        date: String(fd.get("date") || new Date().toISOString().slice(0, 10)),
        time: String(fd.get("time") || "") || undefined,
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="label-muted">Fecha</Label>
          <Input name="date" type="date" defaultValue={initial?.date || new Date().toISOString().slice(0, 10)} className="bg-muted/40 border-border/60" />
        </div>
        <div className="space-y-1">
          <Label className="label-muted">Hora</Label>
          <Input name="time" type="time" defaultValue={(initial as CalendarEvent)?.time} className="bg-muted/40 border-border/60" />
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

export default function TareasPage() {
  const { state, saveCalendarEvent, deleteCalendarEvent, saveCompanyNote, deleteCompanyNote } = useCrm();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const todayStr = today.toISOString().slice(0, 10);
  const companies = [...new Set(state.calendarEvents.map((e) => e.company).filter(Boolean) as string[])];

  async function handleToggle(event: CalendarEvent) {
    try { await saveCalendarEvent({ ...event, completed: !event.completed }); } catch { toast.error("Error"); }
  }
  async function handleDelete(id: string) {
    try { await deleteCalendarEvent(id); toast.success("Eliminado"); } catch { toast.error("Error"); }
  }
  async function handleReschedule(event: CalendarEvent, newDate: string) {
    await saveCalendarEvent({ ...event, date: newDate });
  }
  async function handleImport(imported: CalendarEvent[]) {
    for (const ev of imported) await saveCalendarEvent(ev);
  }

  const upcomingEvents = state.calendarEvents
    .filter((e) => !e.completed && e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 20);

  return (
    <div className="space-y-4">
      <TaskMetrics />

      <TaskCharts events={state.calendarEvents} />

      <ContributionHeatmap events={state.calendarEvents} />

      <div className="flex items-center justify-end gap-2">
        <TaskToolbar events={state.calendarEvents} onImport={handleImport} />
        <Button size="sm" onClick={() => { setSelectedDate(todayStr); setOpen(true); }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Nueva tarea
        </Button>
      </div>

      <Tabs defaultValue="lista">
        <TabsList className="bg-muted/30 border border-border/40">
          <TabsTrigger value="lista" className="text-[12px]">Lista</TabsTrigger>
          <TabsTrigger value="calendario" className="text-[12px]">Calendario</TabsTrigger>
          <TabsTrigger value="notas" className="text-[12px]">Notas por empresa</TabsTrigger>
        </TabsList>

        {/* Lista */}
        <TabsContent value="lista" className="mt-4 space-y-2">
          {upcomingEvents.length === 0 ? (
            <div className="metric-card rounded-xl p-10 text-center">
              <p className="text-muted-foreground text-sm">Sin tareas pendientes.</p>
            </div>
          ) : upcomingEvents.map((event) => {
            const tc = TYPE_CONFIG[event.type];
            const isToday = event.date === todayStr;
            return (
              <div key={event.id} className={cn("metric-card rounded-lg p-3 flex items-start gap-3", event.completed && "opacity-50")}>
                <button onClick={() => handleToggle(event)}
                  className={cn("mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                    event.completed ? "bg-[var(--success)] border-[var(--success)]" : "border-border/60 hover:border-primary")}>
                  {event.completed && <Check className="h-2.5 w-2.5 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn("text-sm font-medium", event.completed ? "line-through text-muted-foreground" : "text-foreground/90")}>{event.title}</p>
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", tc.color)}>{tc.label}</span>
                    {isToday && <span className="text-[10px] font-bold text-primary bg-primary/8 px-1.5 py-0.5 rounded">HOY</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    <span>{event.date}{event.time ? ` · ${event.time}` : ""}</span>
                    {event.company && <span>· {event.company}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditing(event)} className="p-1 text-muted-foreground hover:text-foreground"><Plus className="h-3.5 w-3.5 rotate-45" /></button>
                  <button onClick={() => handleDelete(event.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* Calendario */}
        <TabsContent value="calendario" className="mt-4">
          <CalendarPro
            events={state.calendarEvents}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onNewEvent={(date) => { setSelectedDate(date); setOpen(true); }}
            onEdit={(e) => setEditing(e)}
            onReschedule={handleReschedule}
          />
        </TabsContent>

        {/* Notas por empresa */}
        <TabsContent value="notas" className="mt-4">
          <CompanyNotesList notes={state.companyNotes} onSave={saveCompanyNote} onDelete={deleteCompanyNote} />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border/60 max-w-md">
          <DialogHeader><DialogTitle className="text-heading">Nueva tarea</DialogTitle></DialogHeader>
          <EventForm initial={{ date: selectedDate || todayStr }} onSave={saveCalendarEvent} onClose={() => setOpen(false)} companies={companies} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="bg-card border-border/60 max-w-md">
          <DialogHeader><DialogTitle className="text-heading">Editar tarea</DialogTitle></DialogHeader>
          {editing && <EventForm initial={editing} onSave={saveCalendarEvent} onClose={() => setEditing(null)} companies={companies} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompanyNotesList({ notes, onSave, onDelete }: {
  notes: CompanyNote[];
  onSave: (n: CompanyNote) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyNote | null>(null);
  const [company, setCompany] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!company.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await onSave({ id: editing?.id || crypto.randomUUID(), company: company.trim(), content: content.trim(), updated_at: new Date().toISOString() });
      setOpen(false); setEditing(null); setCompany(""); setContent("");
    } catch { toast.error("Error al guardar"); } finally { setSaving(false); }
  }

  function openNew() { setEditing(null); setCompany(""); setContent(""); setOpen(true); }
  function openEdit(n: CompanyNote) { setEditing(n); setCompany(n.company); setContent(n.content); setOpen(true); }

  return (
    <div className="space-y-3">
      <Button size="sm" variant="outline" onClick={openNew} className="gap-1.5 border-border/60 text-muted-foreground hover:text-foreground">
        <Building2 className="h-3.5 w-3.5" /> Nueva nota
      </Button>
      {notes.map((n) => (
        <div key={n.id} className="metric-card rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground/90">{n.company}</p>
            <div className="flex gap-1">
              <button onClick={() => openEdit(n)} className="p-1 text-muted-foreground hover:text-foreground"><Plus className="h-3.5 w-3.5 rotate-45" /></button>
              <button onClick={() => onDelete(n.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.content}</p>
        </div>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border/60 max-w-md">
          <DialogHeader><DialogTitle className="text-heading">{editing ? "Editar nota" : "Nueva nota"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="label-muted">Empresa</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} className="bg-muted/40 border-border/60" /></div>
            <div className="space-y-1"><Label className="label-muted">Nota</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} className="bg-muted/40 border-border/60 resize-none" /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button size="sm" disabled={saving} onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
