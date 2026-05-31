"use client";

import { useState } from "react";
import { Plus, ExternalLink, Check, Trash2, Pencil } from "lucide-react";
import { useCrm } from "@/components/crm/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Proposal, ProposalStatus, OnboardingDoc } from "@/types/crm";

const PROPOSAL_ESTADOS: ProposalStatus[] = ["enviado", "en_negociacion", "aceptado", "rechazado", "vencido"];
const ESTADO_CONFIG: Record<ProposalStatus, string> = {
  enviado: "border-sky-400/30 text-sky-400",
  en_negociacion: "border-amber-400/30 text-amber-400",
  aceptado: "border-emerald-400/30 text-emerald-400",
  rechazado: "border-red-400/30 text-red-400",
  vencido: "border-border/40 text-muted-foreground",
};

function ProposalForm({ proposal, onSave, onClose }: { proposal?: Proposal | null; onSave: (p: Proposal) => Promise<void>; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [estado, setEstado] = useState<ProposalStatus>(proposal?.estado || "enviado");
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await onSave({
        id: proposal?.id || crypto.randomUUID(),
        cliente: String(fd.get("cliente") || ""),
        concepto: String(fd.get("concepto") || ""),
        monto_usd: String(fd.get("monto_usd")) === "" ? null : Number(fd.get("monto_usd")),
        fecha_envio: String(fd.get("fecha_envio") || new Date().toISOString().slice(0, 10)),
        proximo_seguimiento: String(fd.get("seguimiento") || "") || null,
        estado,
        link_documento: String(fd.get("link") || "") || null,
        notas: String(fd.get("notas") || ""),
        created_at: proposal?.created_at,
      });
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1"><Label className="label-muted">Cliente</Label>
        <Input name="cliente" defaultValue={proposal?.cliente} required className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Concepto</Label>
        <Input name="concepto" defaultValue={proposal?.concepto} required className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Monto USD</Label>
        <Input name="monto_usd" type="number" step="0.01" defaultValue={proposal?.monto_usd ?? ""} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Estado</Label>
        <Select value={estado} onValueChange={(v) => setEstado(v as ProposalStatus)}>
          <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent>{PROPOSAL_ESTADOS.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label className="label-muted">Fecha envío</Label>
        <Input name="fecha_envio" type="date" defaultValue={proposal?.fecha_envio || new Date().toISOString().slice(0, 10)} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Próx. seguimiento</Label>
        <Input name="seguimiento" type="date" defaultValue={proposal?.proximo_seguimiento ?? ""} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1 col-span-2"><Label className="label-muted">Link documento</Label>
        <Input name="link" type="url" defaultValue={proposal?.link_documento ?? ""} placeholder="https://..." className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1 col-span-2"><Label className="label-muted">Notas</Label>
        <Textarea name="notas" defaultValue={proposal?.notas} rows={2} className="bg-muted/40 border-border/60 resize-none" /></div>
      <div className="col-span-2 flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? "Guardando..." : "Guardar"}</Button>
      </div>
    </form>
  );
}

function OnboardingForm({ doc, onSave, onClose }: { doc?: OnboardingDoc | null; onSave: (d: OnboardingDoc) => Promise<void>; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [tipo, setTipo] = useState<OnboardingDoc["tipo"]>(doc?.tipo || "bienvenida");
  const [estado, setEstado] = useState<OnboardingDoc["estado"]>(doc?.estado || "borrador");
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await onSave({
        id: doc?.id || crypto.randomUUID(),
        cliente: String(fd.get("cliente") || ""),
        empresa: String(fd.get("empresa") || "") || null,
        tipo, estado,
        fecha: String(fd.get("fecha") || new Date().toISOString().slice(0, 10)),
        notas: String(fd.get("notas") || ""),
        created_at: doc?.created_at,
      });
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1"><Label className="label-muted">Cliente</Label>
        <Input name="cliente" defaultValue={doc?.cliente} required className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Empresa</Label>
        <Input name="empresa" defaultValue={doc?.empresa ?? ""} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Tipo</Label>
        <Select value={tipo} onValueChange={(v) => setTipo(v as OnboardingDoc["tipo"])}>
          <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="bienvenida">Bienvenida</SelectItem><SelectItem value="onboarding">Onboarding</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label className="label-muted">Estado</Label>
        <Select value={estado} onValueChange={(v) => setEstado(v as OnboardingDoc["estado"])}>
          <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="borrador">Borrador</SelectItem><SelectItem value="enviado">Enviado</SelectItem><SelectItem value="firmado">Firmado</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label className="label-muted">Fecha</Label>
        <Input name="fecha" type="date" defaultValue={doc?.fecha || new Date().toISOString().slice(0, 10)} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1 col-span-2"><Label className="label-muted">Notas</Label>
        <Textarea name="notas" defaultValue={doc?.notas} rows={2} className="bg-muted/40 border-border/60 resize-none" /></div>
      <div className="col-span-2 flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? "Guardando..." : "Guardar"}</Button>
      </div>
    </form>
  );
}

export default function DocumentosPage() {
  const { state, saveProposal, deleteProposal, saveOnboardingDoc, deleteOnboardingDoc } = useCrm();
  const [propOpen, setPropOpen] = useState(false);
  const [editingProp, setEditingProp] = useState<Proposal | null>(null);
  const [onbOpen, setOnbOpen] = useState(false);
  const [editingOnb, setEditingOnb] = useState<OnboardingDoc | null>(null);
  const [filterEstado, setFilterEstado] = useState<ProposalStatus | "todos">("todos");

  const filteredProps = filterEstado === "todos" ? state.proposals : state.proposals.filter((p) => p.estado === filterEstado);
  const totalProposals = state.proposals.filter((p) => p.estado === "aceptado").reduce((a, p) => a + (p.monto_usd || 0), 0);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="presupuestos">
        <TabsList className="bg-muted/30 border border-border/40">
          <TabsTrigger value="presupuestos" className="text-[12px]">Presupuestos</TabsTrigger>
          <TabsTrigger value="onboarding" className="text-[12px]">Onboarding</TabsTrigger>
          <TabsTrigger value="planes" className="text-[12px]">Planes</TabsTrigger>
        </TabsList>

        {/* Presupuestos */}
        <TabsContent value="presupuestos" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg p-0.5 border border-border/40 flex-wrap">
              {(["todos", ...PROPOSAL_ESTADOS] as const).map((f) => (
                <button key={f} onClick={() => setFilterEstado(f)}
                  className={cn("px-2.5 py-1.5 text-[10px] font-semibold rounded-md capitalize transition-all",
                    filterEstado === f ? "bg-primary/8 text-primary" : "text-muted-foreground hover:text-foreground")}>
                  {f.replace("_", " ")}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3">
              {totalProposals > 0 && (
                <p className="text-sm text-[var(--success)] font-semibold">USD {totalProposals.toFixed(0)} aceptado</p>
              )}
              <Button size="sm" onClick={() => setPropOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Presupuesto
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {filteredProps.map((p) => (
              <div key={p.id} className="metric-card rounded-lg p-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground/90 truncate">{p.cliente}</p>
                    <Badge variant="outline" className={cn("text-[10px] font-semibold border shrink-0", ESTADO_CONFIG[p.estado])}>
                      {p.estado.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{p.concepto}</p>
                  {p.monto_usd != null && (
                    <p className="text-[12px] font-bold text-foreground/80 mt-1 sm:hidden">USD {p.monto_usd.toFixed(0)}</p>
                  )}
                  {p.proximo_seguimiento && (
                    <p className="text-[11px] text-primary mt-0.5">→ Seguimiento {p.proximo_seguimiento}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.monto_usd != null && <p className="hidden sm:block font-bold text-foreground/80 text-sm">USD {p.monto_usd.toFixed(0)}</p>}
                  {p.link_documento && (
                    <a href={p.link_documento} target="_blank" rel="noreferrer" className="p-2 text-muted-foreground hover:text-primary">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button onClick={() => setEditingProp(p)} className="p-2 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                  <button onClick={async () => { try { await deleteProposal(p.id); toast.success("Eliminado"); } catch { toast.error("Error"); } }} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {filteredProps.length === 0 && <div className="metric-card rounded-xl p-10 text-center"><p className="text-sm text-muted-foreground">Sin presupuestos.</p></div>}
          </div>

          <Dialog open={propOpen || !!editingProp} onOpenChange={(o) => { if (!o) { setPropOpen(false); setEditingProp(null); } }}>
            <DialogContent className="bg-card border-border/60 w-[calc(100vw-2rem)] sm:max-w-lg">
              <DialogHeader><DialogTitle className="text-heading">{editingProp ? "Editar presupuesto" : "Nuevo presupuesto"}</DialogTitle></DialogHeader>
              <ProposalForm proposal={editingProp} onSave={saveProposal} onClose={() => { setPropOpen(false); setEditingProp(null); }} />
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Onboarding */}
        <TabsContent value="onboarding" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setOnbOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Nuevo doc
            </Button>
          </div>
          <div className="space-y-2">
            {state.onboardingDocs.map((doc) => (
              <div key={doc.id} className="metric-card rounded-lg p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground/90">{doc.cliente}</p>
                    <Badge variant="outline" className={cn("text-[10px] border capitalize",
                      doc.estado === "firmado" ? "border-[var(--success)]/30 text-[var(--success)]" :
                        doc.estado === "enviado" ? "border-primary/30 text-primary" : "border-border/40 text-muted-foreground")}>
                      {doc.estado}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] border-border/40 text-muted-foreground">{doc.tipo}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{doc.empresa || ""} · {doc.fecha}</p>
                </div>
                <div className="flex items-center gap-2">
                  {doc.estado === "firmado" && <Check className="h-4 w-4 text-[var(--success)]" />}
                  <button onClick={() => setEditingOnb(doc)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={async () => { try { await deleteOnboardingDoc(doc.id); toast.success("Eliminado"); } catch { toast.error("Error"); } }} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
            {state.onboardingDocs.length === 0 && <div className="metric-card rounded-xl p-10 text-center"><p className="text-sm text-muted-foreground">Sin documentos de onboarding.</p></div>}
          </div>
          <Dialog open={onbOpen || !!editingOnb} onOpenChange={(o) => { if (!o) { setOnbOpen(false); setEditingOnb(null); } }}>
            <DialogContent className="bg-card border-border/60 max-w-md">
              <DialogHeader><DialogTitle className="text-heading">{editingOnb ? "Editar doc" : "Nuevo documento"}</DialogTitle></DialogHeader>
              <OnboardingForm doc={editingOnb} onSave={saveOnboardingDoc} onClose={() => { setOnbOpen(false); setEditingOnb(null); }} />
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Planes */}
        <TabsContent value="planes" className="mt-4">
          <div className="metric-card rounded-xl p-10 text-center">
            <p className="text-muted-foreground text-sm">Módulo de planes y plantillas — próximamente.</p>
            <p className="text-[11px] text-muted-foreground/50 mt-1">Acá van los planes de servicio y las plantillas de propuestas.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
