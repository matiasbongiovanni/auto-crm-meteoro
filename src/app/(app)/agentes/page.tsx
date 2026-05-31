"use client";

import { useState } from "react";
import { Plus, Pencil, Bot, Zap, PauseCircle, AlertCircle } from "lucide-react";
import { useCrm } from "@/components/crm/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ProspectorPanel } from "@/components/crm/ProspectorPanel";
import type { Agent, PipelineStage } from "@/types/crm";

const STATUS_CONFIG: Record<Agent["status"], { icon: React.ReactNode; class: string }> = {
  activo: { icon: <Zap className="h-3 w-3" />, class: "text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/20" },
  pausado: { icon: <PauseCircle className="h-3 w-3" />, class: "text-muted-foreground bg-muted/50 border-border/40" },
  bloqueado: { icon: <AlertCircle className="h-3 w-3" />, class: "text-destructive bg-destructive/10 border-destructive/20" },
};

const PRIORITY_COLOR: Record<Agent["priority"], string> = {
  alta: "text-red-400",
  media: "text-amber-400",
  baja: "text-muted-foreground",
};

const PIPELINE_STAGES: PipelineStage[] = ["lead", "contacted", "in_progress", "closed"];

function AgentForm({ agent, onSave, onClose }: { agent?: Agent | null; onSave: (a: Agent) => Promise<void>; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Agent["status"]>(agent?.status || "activo");
  const [priority, setPriority] = useState<Agent["priority"]>(agent?.priority || "media");
  const [stage, setStage] = useState<PipelineStage>(agent?.pipeline_stage || "lead");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await onSave({
        id: agent?.id || crypto.randomUUID(),
        name: String(fd.get("name") || ""),
        role: String(fd.get("role") || ""),
        status, priority,
        task: String(fd.get("task") || ""),
        owner: String(fd.get("owner") || ""),
        updated_at: new Date().toISOString(),
        pipeline_stage: stage,
        model: String(fd.get("model") || ""),
        capabilities: String(fd.get("capabilities") || "").split(",").map((s) => s.trim()).filter(Boolean),
      });
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1"><Label className="label-muted">Nombre</Label>
        <Input name="name" defaultValue={agent?.name} required className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Rol</Label>
        <Input name="role" defaultValue={agent?.role} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Estado</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as Agent["status"])}>
          <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="activo">Activo</SelectItem><SelectItem value="pausado">Pausado</SelectItem><SelectItem value="bloqueado">Bloqueado</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label className="label-muted">Prioridad</Label>
        <Select value={priority} onValueChange={(v) => setPriority(v as Agent["priority"])}>
          <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="alta">Alta</SelectItem><SelectItem value="media">Media</SelectItem><SelectItem value="baja">Baja</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label className="label-muted">Owner</Label>
        <Input name="owner" defaultValue={agent?.owner} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Modelo IA</Label>
        <Input name="model" defaultValue={agent?.model} placeholder="claude-opus-4-8" className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1 col-span-2"><Label className="label-muted">Etapa pipeline</Label>
        <div className="flex gap-1.5 flex-wrap">
          {PIPELINE_STAGES.map((s) => (
            <button key={s} type="button" onClick={() => setStage(s)}
              className={cn("px-2.5 py-1 rounded text-[10px] font-semibold border transition-all",
                stage === s ? "bg-primary/8 text-primary border-primary/20" : "border-border/40 text-muted-foreground hover:text-foreground")}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1 col-span-2"><Label className="label-muted">Capacidades (separadas por coma)</Label>
        <Input name="capabilities" defaultValue={agent?.capabilities?.join(", ")} placeholder="prospección, whatsapp..." className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1 col-span-2"><Label className="label-muted">Tarea actual</Label>
        <Textarea name="task" defaultValue={agent?.task} rows={3} className="bg-muted/40 border-border/60 resize-none" /></div>
      <div className="col-span-2 flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? "Guardando..." : "Guardar"}</Button>
      </div>
    </form>
  );
}

export default function AgentesPage() {
  const { state, saveAgent } = useCrm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);

  const byStatus = {
    activo: state.agents.filter((a) => a.status === "activo").length,
    bloqueado: state.agents.filter((a) => a.status === "bloqueado").length,
    alta: state.agents.filter((a) => a.priority === "alta").length,
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Activos", value: byStatus.activo, color: "text-[var(--success)]" },
          { label: "Alta prioridad", value: byStatus.alta, color: "text-[var(--warning)]" },
          { label: "Bloqueados", value: byStatus.bloqueado, color: "text-destructive" },
        ].map(({ label, value, color }) => (
          <div key={label} className="metric-card rounded-xl p-4 text-center">
            <p className={cn("text-2xl font-bold tracking-tight", color)}>{value}</p>
            <p className="label-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Nuevo agente
        </Button>
      </div>

      {/* Agent grid */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {state.agents.map((agent) => {
          const sc = STATUS_CONFIG[agent.status];
          return (
            <div key={agent.id} className="metric-card rounded-xl p-4 hover-glow group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/8">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground/90 text-sm">{agent.name}</p>
                    <p className="text-[11px] text-muted-foreground">{agent.role}</p>
                  </div>
                </div>
                <button onClick={() => setEditing(agent)} className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{agent.task || "Sin tarea asignada"}</p>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Badge variant="outline" className={cn("gap-1 text-[10px] font-semibold border", sc.class)}>
                  {sc.icon} {agent.status}
                </Badge>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-semibold uppercase", PRIORITY_COLOR[agent.priority])}>
                    ↑ {agent.priority}
                  </span>
                  {agent.model && <span className="text-[10px] text-muted-foreground/60">{agent.model.split("-").slice(-1)[0]}</span>}
                </div>
              </div>

              {agent.capabilities && agent.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {agent.capabilities.slice(0, 3).map((cap) => (
                    <span key={cap} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/70">{cap}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {state.agents.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 metric-card rounded-xl p-10 text-center">
            <p className="text-muted-foreground text-sm">Sin agentes registrados.</p>
          </div>
        )}
      </div>

      {/* Agente Prospector — panel de configuración */}
      <div className="space-y-2">
        <div>
          <p className="text-sm font-semibold text-foreground/90">Agente Prospector (WhatsApp)</p>
          <p className="text-[11px] text-muted-foreground">Configuración del bot de prospección automática vía AgentKit.</p>
        </div>
        <ProspectorPanel />
      </div>

      <Dialog open={open || !!editing} onOpenChange={(o) => { if (!o) { setOpen(false); setEditing(null); } }}>
        <DialogContent className="bg-card border-border/60 max-w-lg">
          <DialogHeader><DialogTitle className="text-heading">{editing ? "Editar agente" : "Nuevo agente"}</DialogTitle></DialogHeader>
          <AgentForm agent={editing} onSave={saveAgent} onClose={() => { setOpen(false); setEditing(null); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
