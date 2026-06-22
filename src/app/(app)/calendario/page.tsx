"use client";

import { useState } from "react";
import { Plus, Sparkles, ListTodo } from "lucide-react";
import Link from "next/link";
import { useCrm } from "@/components/crm/provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { CalendarEvent } from "@/types/crm";
import { CalendarPro } from "@/components/tareas/CalendarPro";
import { AiTaskParser } from "@/components/tareas/AiTaskParser";
import { EventForm } from "@/components/tareas/EventForm";
import { parseHM, minToHM } from "@/lib/calendar-time";

export default function CalendarioPage() {
  const { state, saveCalendarEvent, deleteCalendarEvent } = useCrm();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const companies = [...new Set(state.calendarEvents.map((e) => e.company).filter(Boolean) as string[])];

  async function handleToggle(event: CalendarEvent) {
    try { await saveCalendarEvent({ ...event, completed: !event.completed }); } catch { toast.error("Error"); }
  }
  async function handleDelete(id: string) {
    try { await deleteCalendarEvent(id); toast.success("Eliminado"); } catch { toast.error("Error"); }
  }
  async function handleReschedule(event: CalendarEvent, newDate: string, newTime?: string) {
    if (newTime) {
      const start = parseHM(event.time);
      const oldEnd = parseHM(event.end_time);
      const newStart = parseHM(newTime);
      const dur = start !== null && oldEnd !== null ? oldEnd - start : 60;
      const end_time = newStart !== null ? minToHM(newStart + dur) : event.end_time;
      await saveCalendarEvent({ ...event, date: newDate, time: newTime, end_time });
    } else {
      await saveCalendarEvent({ ...event, date: newDate });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Link href="/tareas" className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground">
          <ListTodo className="h-3.5 w-3.5" /> Ver tareas
        </Link>
        <Button size="sm" variant="outline" onClick={() => setAiOpen(true)} className="border-border/50 gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Cargar con IA
        </Button>
        <Button size="sm" onClick={() => { setSelectedDate(todayStr); setSelectedTime(undefined); setOpen(true); }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Nuevo evento
        </Button>
      </div>

      <CalendarPro
        events={state.calendarEvents}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onNewEvent={(date, time) => { setSelectedDate(date); setSelectedTime(time); setOpen(true); }}
        onEdit={(e) => setEditing(e)}
        onReschedule={handleReschedule}
      />

      <AiTaskParser open={aiOpen} onClose={() => setAiOpen(false)} companies={companies} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border/60 max-w-md">
          <DialogHeader><DialogTitle className="text-heading">Nuevo evento</DialogTitle></DialogHeader>
          <EventForm initial={{ date: selectedDate || todayStr, time: selectedTime }} onSave={saveCalendarEvent} onClose={() => setOpen(false)} companies={companies} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="bg-card border-border/60 max-w-md">
          <DialogHeader><DialogTitle className="text-heading">Editar evento</DialogTitle></DialogHeader>
          {editing && <EventForm initial={editing} onSave={saveCalendarEvent} onClose={() => setEditing(null)} companies={companies} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
