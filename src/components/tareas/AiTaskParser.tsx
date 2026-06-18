"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { useCrm } from "@/components/crm/provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventType } from "@/types/crm";
import type { ParsedTask } from "@/lib/ai-prompts";

const TYPE_LABELS: Record<CalendarEventType, string> = {
  tarea: "Tarea",
  reunion: "Reunión",
  seguimiento: "Seguimiento",
  entrega: "Entrega",
  cobro: "Cobro",
};
const TYPES = Object.keys(TYPE_LABELS) as CalendarEventType[];

type Editable = ParsedTask & { _id: string; included: boolean };

const PLACEHOLDER =
  "Pegá texto libre. Ej: el lunes reunión con DentalQuality 15hs, el miércoles entregar la landing de SIDEAS, seguir a Núcleo el viernes y cobrar la mensualidad de CARA.";

export function AiTaskParser({ open, onClose, companies }: { open: boolean; onClose: () => void; companies: string[] }) {
  const { parseTareasAI, saveCalendarEvent } = useCrm();
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Editable[] | null>(null);

  function reset() {
    setText(""); setItems(null); setAnalyzing(false); setSaving(false);
  }
  function handleClose() { reset(); onClose(); }

  async function handleAnalyze() {
    if (!text.trim()) return;
    setAnalyzing(true);
    try {
      const events = await parseTareasAI(text.trim());
      if (events.length === 0) {
        toast.info("No se detectaron tareas en el texto.");
        setItems([]);
        return;
      }
      setItems(events.map((e) => ({
        ...e,
        type: TYPES.includes(e.type) ? e.type : "tarea",
        notes: e.notes || "",
        _id: crypto.randomUUID(),
        included: true,
      })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo analizar el texto");
    } finally {
      setAnalyzing(false);
    }
  }

  function upd(id: string, patch: Partial<Editable>) {
    setItems((cur) => cur?.map((it) => (it._id === id ? { ...it, ...patch } : it)) ?? null);
  }

  async function handleLoad() {
    const chosen = (items ?? []).filter((it) => it.included && it.title.trim() && it.date);
    if (chosen.length === 0) { toast.error("No hay tareas válidas para cargar."); return; }
    setSaving(true);
    try {
      for (const it of chosen) {
        const event: CalendarEvent = {
          id: crypto.randomUUID(),
          title: it.title.trim(),
          date: it.date,
          time: it.time || undefined,
          company: it.company || undefined,
          type: it.type,
          completed: false,
          notes: it.notes || "",
          created_at: new Date().toISOString(),
        };
        await saveCalendarEvent(event);
      }
      toast.success(`${chosen.length} ${chosen.length === 1 ? "tarea cargada" : "tareas cargadas"}`);
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar las tareas");
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = (items ?? []).filter((it) => it.included).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="bg-card border-border/60 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-heading flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Cargar tareas con IA
          </DialogTitle>
        </DialogHeader>

        {!items ? (
          <div className="space-y-3">
            <Label className="label-muted">Describí tus tareas en lenguaje natural</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={PLACEHOLDER}
              className="bg-muted/40 border-border/60 resize-none text-[13px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={handleClose}>Cancelar</Button>
              <Button size="sm" disabled={!text.trim() || analyzing} onClick={handleAnalyze}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
                {analyzing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analizando...</> : <><Sparkles className="h-3.5 w-3.5" /> Analizar</>}
              </Button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center py-6">No se detectaron tareas. Probá con otro texto.</p>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setItems(null)}>Volver</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">Revisá y editá antes de cargar. Destildá las que no quieras.</p>
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it._id} className={cn("rounded-lg border p-3 space-y-2 transition-opacity",
                  it.included ? "border-border/60 bg-muted/20" : "border-border/30 opacity-50")}>
                  <div className="flex items-start gap-2">
                    <button type="button" onClick={() => upd(it._id, { included: !it.included })}
                      className={cn("mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0",
                        it.included ? "bg-primary border-primary" : "border-border/60")}>
                      {it.included && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </button>
                    <Input value={it.title} onChange={(e) => upd(it._id, { title: e.target.value })}
                      className="bg-muted/40 border-border/60 text-[13px] h-8 flex-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    <Input type="date" value={it.date} onChange={(e) => upd(it._id, { date: e.target.value })}
                      className="bg-muted/40 border-border/60 text-[12px] h-7" />
                    <Input type="time" value={it.time || ""} onChange={(e) => upd(it._id, { time: e.target.value })}
                      className="bg-muted/40 border-border/60 text-[12px] h-7" />
                  </div>
                  <div className="pl-6">
                    <Input list="ai-companies" placeholder="Empresa (opcional)" value={it.company || ""}
                      onChange={(e) => upd(it._id, { company: e.target.value })}
                      className="bg-muted/40 border-border/60 text-[12px] h-7" />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-6">
                    {TYPES.map((t) => (
                      <button key={t} type="button" onClick={() => upd(it._id, { type: t })}
                        className={cn("px-2 py-0.5 rounded text-[10px] font-semibold border transition-all",
                          it.type === t ? "border-primary text-primary bg-primary/10" : "border-border/40 text-muted-foreground hover:text-foreground")}>
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <datalist id="ai-companies">{companies.map((c) => <option key={c} value={c} />)}</datalist>
            <div className="flex justify-between items-center pt-1">
              <Button variant="ghost" size="sm" onClick={() => setItems(null)}>Volver</Button>
              <Button size="sm" disabled={saving || selectedCount === 0} onClick={handleLoad}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
                {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando...</> : `Cargar ${selectedCount} ${selectedCount === 1 ? "tarea" : "tareas"}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
