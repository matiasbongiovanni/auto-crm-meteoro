"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, ExternalLink, Check, Trash2, Pencil, FileText, X } from "lucide-react";
import { useCrm } from "@/components/crm/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// ─── Visor de generador HTML ──────────────────────────────────────────────────
function GeneradorViewer({
  src,
  title,
  open,
  onClose,
  onSaved,
}: {
  src: string;
  title: string;
  open: boolean;
  onClose: () => void;
  onSaved?: (payload: Record<string, unknown>) => void;
}) {
  useEffect(() => {
    if (!open) return;
    function handleMsg(e: MessageEvent) {
      if (
        e.data?.type === "meteoro-quote-saved" ||
        e.data?.type === "meteoro-onboarding-saved" ||
        e.data?.type === "meteoro-planes-saved"
      ) {
        onSaved?.(e.data.payload);
      }
    }
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, [open, onSaved]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 shrink-0 bg-card">
        <p className="text-[12px] font-semibold uppercase tracking-widest text-foreground/80">{title}</p>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <iframe
        src={src}
        title={title}
        className="flex-1 w-full border-0"
        allow="print"
      />
    </div>
  );
}

// ─── Form rápido para metadata después de guardar desde el generador ─────────
function SaveMetaDialog({
  open,
  tipo,
  clienteDefault,
  onSave,
  onClose,
}: {
  open: boolean;
  tipo: "cotizacion" | "onboarding" | "planes";
  clienteDefault: string;
  onSave: (meta: { cliente: string; monto?: number; estado: string; notas: string }) => void;
  onClose: () => void;
}) {
  const [cliente, setCliente] = useState(clienteDefault);
  const [monto, setMonto] = useState("");
  const [estado, setEstado] = useState(tipo === "onboarding" || tipo === "planes" ? "borrador" : "enviado");
  const [notas, setNotas] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-card border-border/60 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-heading">Guardar en CRM</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="label-muted">Cliente</Label>
            <Input value={cliente} onChange={(e) => setCliente(e.target.value)} className="bg-muted/40 border-border/60" />
          </div>
          {tipo === "cotizacion" && (
            <div className="space-y-1">
              <Label className="label-muted">Monto total (opcional)</Label>
              <Input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" className="bg-muted/40 border-border/60" />
            </div>
          )}
          <div className="space-y-1">
            <Label className="label-muted">Estado</Label>
            {tipo === "cotizacion" ? (
              <Select value={estado} onValueChange={(v) => { if (v) setEstado(v); }}>
                <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROPOSAL_ESTADOS.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Select value={estado} onValueChange={(v) => { if (v) setEstado(v); }}>
                <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="firmado">Firmado</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1">
            <Label className="label-muted">Notas</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="bg-muted/40 border-border/60 resize-none text-[12px]" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" onClick={() => onSave({ cliente, monto: monto ? Number(monto) : undefined, estado, notas })}
              className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function DocumentosPage() {
  const { state, saveProposal, deleteProposal, saveOnboardingDoc, deleteOnboardingDoc } = useCrm();
  const [filterEstado, setFilterEstado] = useState<ProposalStatus | "todos">("todos");

  // Generadores
  const [generador, setGenerador] = useState<{ src: string; title: string; tipo: "cotizacion" | "onboarding" | "planes" } | null>(null);
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);
  const [metaOpen, setMetaOpen] = useState(false);

  // Edit simple
  const [editingProp, setEditingProp] = useState<Proposal | null>(null);
  const [editingOnb, setEditingOnb] = useState<OnboardingDoc | null>(null);

  const filteredProps = filterEstado === "todos" ? state.proposals : state.proposals.filter((p) => p.estado === filterEstado);
  const totalProposals = state.proposals.filter((p) => p.estado === "aceptado").reduce((a, p) => a + (p.monto_usd || 0), 0);

  function openGenerador(tipo: "cotizacion" | "onboarding" | "planes", cliente = "") {
    const map = { cotizacion: "cotizador.html", onboarding: "onboarding.html", planes: "planes.html" };
    const titles = { cotizacion: "Cotizador Meteoro", onboarding: "Generador de Onboarding / Bienvenida", planes: "Generador de Planes" };
    const params = new URLSearchParams();
    if (cliente) params.set("cliente", cliente);
    const src = `/docs/${map[tipo]}${cliente ? "?" + params.toString() : ""}`;
    setGenerador({ src, title: titles[tipo], tipo });
  }

  function handleGeneradorSaved(payload: Record<string, unknown>) {
    setPendingPayload(payload);
    setMetaOpen(true);
  }

  async function handleMetaSave(meta: { cliente: string; monto?: number; estado: string; notas: string }) {
    if (!generador) return;
    try {
      if (generador.tipo === "cotizacion") {
        const payload = pendingPayload ?? {};
        await saveProposal({
          id: crypto.randomUUID(),
          cliente: meta.cliente || String(payload.cliente || ""),
          concepto: String(payload.proyecto || "Cotización"),
          monto_usd: meta.monto ?? (typeof payload.total === "number" ? payload.total : null),
          fecha_envio: String(payload.fecha || new Date().toISOString().slice(0, 10)),
          proximo_seguimiento: null,
          estado: meta.estado as ProposalStatus,
          link_documento: null,
          notas: meta.notas,
        } as Proposal);
      } else {
        const payload = pendingPayload ?? {};
        await saveOnboardingDoc({
          id: crypto.randomUUID(),
          cliente: meta.cliente || String(payload.cliente || ""),
          empresa: String(payload.empresa || "") || null,
          tipo: String(payload.tipo || "bienvenida") as OnboardingDoc["tipo"],
          fecha: String(payload.fecha || new Date().toISOString().slice(0, 10)),
          estado: meta.estado as OnboardingDoc["estado"],
          notas: meta.notas,
        } as OnboardingDoc);
      }
      toast.success("Guardado en CRM");
      setMetaOpen(false);
      setPendingPayload(null);
      setGenerador(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <div className="space-y-4">
      {/* Botones de generadores */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => openGenerador("cotizacion")} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Nueva cotización
        </Button>
        <Button size="sm" variant="outline" onClick={() => openGenerador("onboarding")} className="border-border/50 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Onboarding / Bienvenida
        </Button>
        <Button size="sm" variant="outline" onClick={() => openGenerador("planes")} className="border-border/50 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Plan mensual
        </Button>
      </div>

      <Tabs defaultValue="presupuestos">
        <TabsList className="bg-muted/30 border border-border/40">
          <TabsTrigger value="presupuestos" className="text-[12px]">Presupuestos</TabsTrigger>
          <TabsTrigger value="onboarding" className="text-[12px]">Onboarding</TabsTrigger>
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
            {totalProposals > 0 && (
              <p className="text-sm text-[var(--success)] font-semibold">USD {totalProposals.toFixed(0)} aceptado</p>
            )}
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
                  <button
                    onClick={() => openGenerador("cotizacion", p.cliente)}
                    title="Abrir cotizador"
                    className="p-2 text-muted-foreground hover:text-primary">
                    <FileText className="h-4 w-4" />
                  </button>
                  {p.link_documento && (
                    <a href={p.link_documento} target="_blank" rel="noreferrer" className="p-2 text-muted-foreground hover:text-primary">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button onClick={() => setEditingProp(p)} className="p-2 text-muted-foreground hover:text-foreground">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={async () => { try { await deleteProposal(p.id); toast.success("Eliminado"); } catch { toast.error("Error"); } }} className="p-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {filteredProps.length === 0 && (
              <div className="metric-card rounded-xl p-10 text-center">
                <p className="text-sm text-muted-foreground">Sin presupuestos.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Onboarding */}
        <TabsContent value="onboarding" className="mt-4 space-y-4">
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
                  <button
                    onClick={() => openGenerador("onboarding", doc.cliente)}
                    title="Abrir generador"
                    className="p-1 text-muted-foreground hover:text-primary">
                    <FileText className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setEditingOnb(doc)} className="p-1 text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={async () => { try { await deleteOnboardingDoc(doc.id); toast.success("Eliminado"); } catch { toast.error("Error"); } }} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {state.onboardingDocs.length === 0 && (
              <div className="metric-card rounded-xl p-10 text-center">
                <p className="text-sm text-muted-foreground">Sin documentos de onboarding.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Generador HTML full-screen */}
      {generador && (
        <GeneradorViewer
          src={generador.src}
          title={generador.title}
          open={!!generador}
          onClose={() => setGenerador(null)}
          onSaved={handleGeneradorSaved}
        />
      )}

      {/* Dialog metadata post-save */}
      {metaOpen && generador && (
        <SaveMetaDialog
          open={metaOpen}
          tipo={generador.tipo}
          clienteDefault={String(pendingPayload?.cliente || "")}
          onSave={handleMetaSave}
          onClose={() => { setMetaOpen(false); setPendingPayload(null); }}
        />
      )}

      {/* Edit rápido de propuesta */}
      {editingProp && (
        <Dialog open={!!editingProp} onOpenChange={(o) => { if (!o) setEditingProp(null); }}>
          <DialogContent className="bg-card border-border/60 max-w-sm">
            <DialogHeader><DialogTitle className="text-heading">Editar estado</DialogTitle></DialogHeader>
            <EditProposalMeta proposal={editingProp} onSave={saveProposal} onClose={() => setEditingProp(null)} />
          </DialogContent>
        </Dialog>
      )}

      {editingOnb && (
        <Dialog open={!!editingOnb} onOpenChange={(o) => { if (!o) setEditingOnb(null); }}>
          <DialogContent className="bg-card border-border/60 max-w-sm">
            <DialogHeader><DialogTitle className="text-heading">Editar estado</DialogTitle></DialogHeader>
            <EditOnboardingMeta doc={editingOnb} onSave={saveOnboardingDoc} onClose={() => setEditingOnb(null)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Formularios de edición rápida (solo metadata) ───────────────────────────
function EditProposalMeta({ proposal, onSave, onClose }: { proposal: Proposal; onSave: (p: Proposal) => Promise<void>; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [estado, setEstado] = useState<ProposalStatus>(proposal.estado);
  const [notas, setNotas] = useState(proposal.notas);
  const [monto, setMonto] = useState(proposal.monto_usd?.toString() ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ ...proposal, estado, notas, monto_usd: monto ? Number(monto) : null });
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="label-muted">Estado</Label>
        <Select value={estado} onValueChange={(v) => setEstado(v as ProposalStatus)}>
          <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent>{PROPOSAL_ESTADOS.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="label-muted">Monto USD</Label>
        <Input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} className="bg-muted/40 border-border/60" />
      </div>
      <div className="space-y-1">
        <Label className="label-muted">Notas</Label>
        <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="bg-muted/40 border-border/60 resize-none text-[12px]" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" disabled={saving} onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

function EditOnboardingMeta({ doc, onSave, onClose }: { doc: OnboardingDoc; onSave: (d: OnboardingDoc) => Promise<void>; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [estado, setEstado] = useState<OnboardingDoc["estado"]>(doc.estado);
  const [notas, setNotas] = useState(doc.notas ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ ...doc, estado, notas });
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="label-muted">Estado</Label>
        <Select value={estado} onValueChange={(v) => setEstado(v as OnboardingDoc["estado"])}>
          <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="firmado">Firmado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="label-muted">Notas</Label>
        <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="bg-muted/40 border-border/60 resize-none text-[12px]" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" disabled={saving} onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
