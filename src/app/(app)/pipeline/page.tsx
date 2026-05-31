"use client";

import { useCallback, useState } from "react";
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, DollarSign, Pencil, Trash2 } from "lucide-react";
import { useCrm } from "@/components/crm/provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PipelineCard, PipelineStage } from "@/types/crm";

const STAGES: { id: PipelineStage; label: string; accent: string }[] = [
  { id: "lead", label: "Lead", accent: "border-t-muted-foreground/30" },
  { id: "contacted", label: "Contactado", accent: "border-t-[var(--chart-4)]" },
  { id: "in_progress", label: "En progreso", accent: "border-t-primary" },
  { id: "closed", label: "Cerrado", accent: "border-t-[var(--success)]" },
];

function CardItem({ card, onEdit, onDelete }: { card: PipelineCard; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("metric-card rounded-lg p-3 cursor-grab select-none group transition-opacity", isDragging && "opacity-40")}>
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-0.5 text-muted-foreground/30 hover:text-muted-foreground cursor-grab">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground/90 truncate">{card.title}</p>
          {card.company && <p className="text-[11px] text-muted-foreground truncate">{card.company}</p>}
          {card.value_usd !== null && (
            <p className="flex items-center gap-0.5 text-[11px] text-[var(--success)] mt-1">
              <DollarSign className="h-3 w-3" /> USD {card.value_usd.toLocaleString("es-AR")}
            </p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-0.5 text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
          <button onClick={onDelete} className="p-0.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
      {card.next_step && <p className="text-[10px] text-muted-foreground/60 mt-2 pl-5 truncate">→ {card.next_step}</p>}
    </div>
  );
}

function CardForm({ card, onSave, onClose }: { card?: PipelineCard | null; onSave: (c: PipelineCard) => void; onClose: () => void }) {
  const [stage, setStage] = useState<PipelineStage>(card?.stage || "lead");
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const valueRaw = String(fd.get("value_usd") || "");
    onSave({
      id: card?.id || crypto.randomUUID(),
      title: String(fd.get("title") || ""),
      company: String(fd.get("company") || ""),
      owner: String(fd.get("owner") || ""),
      stage,
      value_usd: valueRaw === "" ? null : Number(valueRaw),
      next_step: String(fd.get("next_step") || ""),
      notes: String(fd.get("notes") || ""),
      updated_at: new Date().toISOString(),
      labels: [],
    });
    onClose();
  }
  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2"><Label className="label-muted">Título</Label>
          <Input name="title" defaultValue={card?.title} required className="bg-muted/40 border-border/60" /></div>
        <div className="space-y-1"><Label className="label-muted">Empresa</Label>
          <Input name="company" defaultValue={card?.company} className="bg-muted/40 border-border/60" /></div>
        <div className="space-y-1"><Label className="label-muted">Valor USD</Label>
          <Input name="value_usd" type="number" step="0.01" defaultValue={card?.value_usd ?? ""} className="bg-muted/40 border-border/60" /></div>
        <div className="space-y-1"><Label className="label-muted">Etapa</Label>
          <div className="flex flex-wrap gap-1">
            {STAGES.map((s) => (
              <button key={s.id} type="button" onClick={() => setStage(s.id)}
                className={cn("px-2 py-1 rounded text-[10px] font-semibold border transition-all",
                  stage === s.id ? "bg-primary/8 text-primary border-primary/20" : "border-border/40 text-muted-foreground hover:text-foreground")}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1"><Label className="label-muted">Owner</Label>
          <Input name="owner" defaultValue={card?.owner} className="bg-muted/40 border-border/60" /></div>
        <div className="space-y-1 col-span-2"><Label className="label-muted">Siguiente paso</Label>
          <Input name="next_step" defaultValue={card?.next_step} className="bg-muted/40 border-border/60" /></div>
        <div className="space-y-1 col-span-2"><Label className="label-muted">Notas</Label>
          <Textarea name="notes" defaultValue={card?.notes} rows={2} className="bg-muted/40 border-border/60 resize-none" /></div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">Guardar</Button>
      </div>
    </form>
  );
}

export default function PipelinePage() {
  const { state, savePipeline } = useCrm();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PipelineCard | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = useCallback((e: DragStartEvent) => setActiveId(e.active.id as string), []);

  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const targetStage = (over.id as string).startsWith("stage-")
      ? (over.id as string).replace("stage-", "") as PipelineStage
      : state.pipeline.find((c) => c.id === over.id)?.stage;
    if (!targetStage) return;
    const updated = state.pipeline.map((c) => c.id === active.id ? { ...c, stage: targetStage, updated_at: new Date().toISOString() } : c);
    try { await savePipeline(updated); } catch { toast.error("Error al mover la tarjeta"); }
  }, [state.pipeline, savePipeline]);

  async function handleSaveCard(card: PipelineCard) {
    const exists = state.pipeline.some((c) => c.id === card.id);
    const updated = exists ? state.pipeline.map((c) => c.id === card.id ? card : c) : [...state.pipeline, card];
    try { await savePipeline(updated); toast.success("Guardado"); } catch { toast.error("Error al guardar"); }
  }

  async function handleDelete(id: string) {
    try { await savePipeline(state.pipeline.filter((c) => c.id !== id)); toast.success("Eliminado"); } catch { toast.error("Error"); }
  }

  const activeCard = activeId ? state.pipeline.find((c) => c.id === activeId) : null;
  const totalValue = state.pipeline.reduce((acc, c) => acc + (c.value_usd || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="text-[var(--success)] font-semibold">USD {totalValue.toLocaleString("es-AR")}</span> en pipeline
        </p>
        <Button size="sm" onClick={() => setOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Nueva tarjeta
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-start">
          {STAGES.map((stage) => {
            const cards = state.pipeline.filter((c) => c.stage === stage.id);
            return (
              <div key={stage.id} id={`stage-${stage.id}`}
                className={cn("metric-card rounded-xl p-3 border-t-2", stage.accent)}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{stage.label}</p>
                  <span className="text-[10px] bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground">{cards.length}</span>
                </div>
                <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 min-h-[80px]">
                    {cards.map((card) => (
                      <CardItem key={card.id} card={card} onEdit={() => setEditing(card)} onDelete={() => handleDelete(card.id)} />
                    ))}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>
        <DragOverlay>
          {activeCard && (
            <div className="metric-card rounded-lg p-3 opacity-90 shadow-xl">
              <p className="text-sm font-medium">{activeCard.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border/60 max-w-md">
          <DialogHeader><DialogTitle className="text-heading">Nueva tarjeta</DialogTitle></DialogHeader>
          <CardForm onSave={handleSaveCard} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="bg-card border-border/60 max-w-md">
          <DialogHeader><DialogTitle className="text-heading">Editar tarjeta</DialogTitle></DialogHeader>
          {editing && <CardForm card={editing} onSave={handleSaveCard} onClose={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
