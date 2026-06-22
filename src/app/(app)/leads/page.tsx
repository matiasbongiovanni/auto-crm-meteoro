"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Flame, Thermometer, Snowflake, Zap } from "lucide-react";
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
import type { Lead, LeadTemperatura } from "@/types/crm";
import { EmpresaLink } from "@/components/shared/EmpresaLink";

const ESTADOS = ["nuevo", "contactado", "calificado", "perdido", "ganado"];
const TEMPERATURAS: LeadTemperatura[] = ["frio", "tibio", "caliente"];

const TEMP_CONFIG: Record<LeadTemperatura, { icon: React.ReactNode; class: string }> = {
  frio: { icon: <Snowflake className="h-3 w-3" />, class: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  tibio: { icon: <Thermometer className="h-3 w-3" />, class: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  caliente: { icon: <Flame className="h-3 w-3" />, class: "bg-red-500/10 text-red-400 border-red-500/20" },
};

function LeadForm({ lead, onSave, onClose }: { lead?: Lead | null; onSave: (l: Lead) => Promise<void>; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [temperatura, setTemperatura] = useState<LeadTemperatura>(lead?.temperatura || "frio");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await onSave({
        id: lead?.id || crypto.randomUUID(),
        nombre: String(fd.get("nombre") || ""),
        origen: String(fd.get("origen") || ""),
        estado: String(fd.get("estado") || "nuevo"),
        accion: String(fd.get("accion") || ""),
        notas: String(fd.get("notas") || ""),
        fase: Number(fd.get("fase") || 1),
        fecha: String(fd.get("fecha") || new Date().toISOString().slice(0, 10)),
        telefono: String(fd.get("telefono") || "") || undefined,
        empresa: String(fd.get("empresa") || "") || undefined,
        temperatura,
      });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1 md:col-span-2">
        <Label className="label-muted">Nombre</Label>
        <Input name="nombre" defaultValue={lead?.nombre} placeholder="Empresa o persona" required className="bg-muted/40 border-border/60" />
      </div>
      <div className="space-y-1">
        <Label className="label-muted">Origen</Label>
        <Input name="origen" defaultValue={lead?.origen} placeholder="Ej. Instagram" className="bg-muted/40 border-border/60" />
      </div>
      <div className="space-y-1">
        <Label className="label-muted">Teléfono</Label>
        <Input name="telefono" defaultValue={lead?.telefono} placeholder="+54 9..." className="bg-muted/40 border-border/60" />
      </div>
      <div className="space-y-1">
        <Label className="label-muted">Empresa</Label>
        <Input name="empresa" defaultValue={lead?.empresa} placeholder="Empresa" className="bg-muted/40 border-border/60" />
      </div>
      <div className="space-y-1">
        <Label className="label-muted">Temperatura</Label>
        <Select value={temperatura} onValueChange={(v) => setTemperatura(v as LeadTemperatura)}>
          <SelectTrigger className="bg-muted/40 border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEMPERATURAS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="label-muted">Estado</Label>
        <Select name="estado" defaultValue={lead?.estado || "nuevo"}>
          <SelectTrigger className="bg-muted/40 border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="label-muted">Fase (1-5)</Label>
        <Input name="fase" type="number" min="1" max="5" defaultValue={lead?.fase || 1} className="bg-muted/40 border-border/60" />
      </div>
      <div className="space-y-1">
        <Label className="label-muted">Fecha</Label>
        <Input name="fecha" type="date" defaultValue={lead?.fecha || new Date().toISOString().slice(0, 10)} className="bg-muted/40 border-border/60" />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label className="label-muted">Siguiente acción</Label>
        <Input name="accion" defaultValue={lead?.accion} placeholder="Ej. Llamar el lunes" className="bg-muted/40 border-border/60" />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label className="label-muted">Notas</Label>
        <Textarea name="notas" defaultValue={lead?.notas} rows={3} placeholder="Contexto..." className="bg-muted/40 border-border/60 resize-none" />
      </div>
      <div className="md:col-span-2 flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

export default function LeadsPage() {
  const { state, saveLead, deleteLead } = useCrm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [filter, setFilter] = useState<LeadTemperatura | "todos">("todos");

  const filtered = filter === "todos" ? state.leads : state.leads.filter((l) => l.temperatura === filter);

  async function handleDelete(id: string) {
    try { await deleteLead(id); toast.success("Lead eliminado"); } catch { toast.error("Error al eliminar"); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg p-0.5 border border-border/40">
          {(["todos", "frio", "tibio", "caliente"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-2.5 py-1 text-[11px] font-semibold rounded-md capitalize transition-all",
                filter === f ? "bg-primary/8 text-primary" : "text-muted-foreground hover:text-foreground")}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Link href="/leads/generador" className="inline-flex h-7 items-center gap-1.5 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium transition-all hover:bg-muted hover:text-foreground">
            <Zap className="h-3.5 w-3.5" /> Generar
          </Link>
          <Button size="sm" onClick={() => setOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Nuevo lead
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="metric-card rounded-xl p-12 text-center">
          <p className="text-muted-foreground text-sm">Sin leads{filter !== "todos" ? ` ${filter}s` : ""}.</p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((lead) => {
              const tc = TEMP_CONFIG[lead.temperatura || "frio"];
              return (
                <div key={lead.id} className="metric-card rounded-xl px-4 py-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground/90 text-sm">{lead.nombre}</p>
                      {lead.empresa && <EmpresaLink name={lead.empresa} muted className="text-[11px]" />}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setEditing(lead)} className="text-muted-foreground hover:text-foreground p-1 rounded">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(lead.id)} className="text-muted-foreground hover:text-destructive p-1 rounded">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn("gap-1 text-[10px] font-semibold border", tc.class)}>
                      {tc.icon} {lead.temperatura || "frio"}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground capitalize">{lead.estado}</span>
                    <span className="text-[11px] text-muted-foreground">F{lead.fase}</span>
                    {lead.telefono && <span className="text-[11px] text-muted-foreground">{lead.telefono}</span>}
                  </div>
                  {lead.accion && (
                    <p className="text-[11px] text-muted-foreground truncate">{lead.accion}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block metric-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  {["Lead", "Teléfono", "Temperatura", "Estado", "Acción", "Fase", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left label-muted font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => {
                  const tc = TEMP_CONFIG[lead.temperatura || "frio"];
                  return (
                    <tr key={lead.id} className="border-b border-border/20 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground/90">{lead.nombre}</p>
                        {lead.empresa && <EmpresaLink name={lead.empresa} muted className="text-[11px]" />}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{lead.telefono || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn("gap-1 text-[10px] font-semibold border", tc.class)}>
                          {tc.icon} {lead.temperatura || "frio"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{lead.estado}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{lead.accion || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">F{lead.fase}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setEditing(lead)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(lead.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border/60 max-w-lg">
          <DialogHeader><DialogTitle className="text-heading">Nuevo lead</DialogTitle></DialogHeader>
          <LeadForm onSave={saveLead} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="bg-card border-border/60 max-w-lg">
          <DialogHeader><DialogTitle className="text-heading">Editar lead</DialogTitle></DialogHeader>
          {editing && <LeadForm lead={editing} onSave={saveLead} onClose={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
