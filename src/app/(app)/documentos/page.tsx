"use client";

import { useMemo, useState } from "react";
import { Plus, ExternalLink, Check, Trash2, Pencil, FileText, TrendingUp, Clock, XCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { useCrm } from "@/components/crm/provider";
import { useViewer } from "@/components/documentos/viewer-context";
import { PresupuestoEditor } from "@/components/documentos/presupuesto-editor";
import { BienvenidaEditor } from "@/components/documentos/bienvenida-editor";
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
import type { Proposal, ProposalStatus, OnboardingDoc, PipelineCard } from "@/types/crm";
import type { PresupuestoData } from "@/lib/documents/types";

const PROPOSAL_ESTADOS: ProposalStatus[] = ["enviado", "en_negociacion", "aceptado", "rechazado", "vencido"];
const ESTADO_CONFIG: Record<ProposalStatus, string> = {
  enviado: "border-sky-400/30 text-sky-400",
  en_negociacion: "border-amber-400/30 text-amber-400",
  aceptado: "border-emerald-400/30 text-emerald-400",
  rechazado: "border-red-400/30 text-red-400",
  vencido: "border-border/40 text-muted-foreground",
};

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

// ─── Métricas de presupuestos ─────────────────────────────────────────────────
function ProposalMetrics({ proposals }: { proposals: Proposal[] }) {
  const stats = useMemo(() => {
    const total = proposals.length;
    if (total === 0) return null;

    const byStatus = proposals.reduce<Record<ProposalStatus, number>>(
      (acc, p) => { acc[p.estado] = (acc[p.estado] || 0) + 1; return acc; },
      { enviado: 0, en_negociacion: 0, aceptado: 0, rechazado: 0, vencido: 0 }
    );

    const montoTotal = proposals.reduce((a, p) => a + (p.monto_usd || 0), 0);
    const montoAceptado = proposals.filter((p) => p.estado === "aceptado").reduce((a, p) => a + (p.monto_usd || 0), 0);
    const montoEnPipeline = proposals.filter((p) => ["enviado", "en_negociacion"].includes(p.estado)).reduce((a, p) => a + (p.monto_usd || 0), 0);

    const activos = byStatus.enviado + byStatus.en_negociacion;
    const tasaConversion = total > 0 ? Math.round((byStatus.aceptado / total) * 100) : 0;
    const tasaRechazo = total > 0 ? Math.round(((byStatus.rechazado + byStatus.vencido) / total) * 100) : 0;

    const ticketPromedio = byStatus.aceptado > 0 ? montoAceptado / byStatus.aceptado : 0;

    return { total, byStatus, montoTotal, montoAceptado, montoEnPipeline, activos, tasaConversion, tasaRechazo, ticketPromedio };
  }, [proposals]);

  if (!stats) return null;

  const fmtUsd = (n: number) => `USD ${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-3">
      {/* Fila 1 — KPIs principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="metric-card rounded-xl p-4">
          <p className="label-muted mb-1">Total presupuestado</p>
          <p className="text-[18px] font-bold text-foreground/90 tracking-tight">{fmtUsd(stats.montoTotal)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{stats.total} presupuestos</p>
        </div>
        <div className="metric-card rounded-xl p-4">
          <p className="label-muted mb-1">Cerrado / Aceptado</p>
          <p className="text-[18px] font-bold text-[var(--success)] tracking-tight">{fmtUsd(stats.montoAceptado)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{stats.byStatus.aceptado} contratos · {stats.tasaConversion}% conversión</p>
        </div>
        <div className="metric-card rounded-xl p-4">
          <p className="label-muted mb-1">En pipeline</p>
          <p className="text-[18px] font-bold text-[var(--warning)] tracking-tight">{fmtUsd(stats.montoEnPipeline)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{stats.activos} activos (enviado + negociación)</p>
        </div>
        <div className="metric-card rounded-xl p-4">
          <p className="label-muted mb-1">Ticket promedio</p>
          <p className="text-[18px] font-bold text-foreground/90 tracking-tight">{stats.ticketPromedio > 0 ? fmtUsd(stats.ticketPromedio) : "—"}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">sobre contratos aceptados</p>
        </div>
      </div>

      {/* Fila 2 — Breakdown por estado */}
      <div className="metric-card rounded-xl p-4">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Distribución por estado</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {([
            { id: "enviado" as ProposalStatus, label: "Enviados", icon: <FileText className="h-3.5 w-3.5" />, color: "text-sky-400" },
            { id: "en_negociacion" as ProposalStatus, label: "Negociación", icon: <Clock className="h-3.5 w-3.5" />, color: "text-amber-400" },
            { id: "aceptado" as ProposalStatus, label: "Aceptados", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-[var(--success)]" },
            { id: "rechazado" as ProposalStatus, label: "Rechazados", icon: <XCircle className="h-3.5 w-3.5" />, color: "text-destructive" },
            { id: "vencido" as ProposalStatus, label: "Vencidos", icon: <AlertCircle className="h-3.5 w-3.5" />, color: "text-muted-foreground" },
          ] as const).map(({ id, label, icon, color }) => {
            const count = stats.byStatus[id];
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={id} className="space-y-1">
                <div className={cn("flex items-center gap-1.5", color)}>
                  {icon}
                  <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
                </div>
                <p className="text-[22px] font-bold text-foreground/90 leading-none">{count}</p>
                <div className="h-1 bg-muted/40 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", {
                    "bg-sky-400": id === "enviado",
                    "bg-amber-400": id === "en_negociacion",
                    "bg-[var(--success)]": id === "aceptado",
                    "bg-destructive": id === "rechazado",
                    "bg-muted-foreground/40": id === "vencido",
                  })} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{pct}%</p>
              </div>
            );
          })}
        </div>

        {/* Barra de conversión */}
        <div className="mt-4 pt-3 border-t border-border/20 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-[var(--success)]" />
            <span className="text-[11px] text-muted-foreground">Tasa de conversión</span>
            <span className="text-[13px] font-bold text-[var(--success)]">{stats.tasaConversion}%</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-[11px] text-muted-foreground">Pérdida (rechazado + vencido)</span>
            <span className="text-[13px] font-bold text-destructive">{stats.tasaRechazo}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function DocumentosPage() {
  const { state, saveProposal, deleteProposal, saveOnboardingDoc, deleteOnboardingDoc, saveLead, savePipeline } = useCrm();

  function calcNextNumero(): string {
    const nums = state.proposals
      .map((p) => parseInt((p.datos as PresupuestoData | null | undefined)?.numero ?? "0", 10))
      .filter((n) => !isNaN(n));
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return String(next).padStart(3, "0");
  }
  const { openViewer, closeViewer, setOnSaved } = useViewer();
  const [filterEstado, setFilterEstado] = useState<ProposalStatus | "todos">("todos");

  const [presupuestoOpen, setPresupuestoOpen] = useState(false);
  const [bienvenidaOpen, setBienvenidaOpen] = useState<"bienvenida" | "onboarding" | null>(null);
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaTipo, setMetaTipo] = useState<"cotizacion" | "onboarding" | "planes">("cotizacion");

  // Edit simple
  const [editingProp, setEditingProp] = useState<Proposal | null>(null);
  const [editingOnb, setEditingOnb] = useState<OnboardingDoc | null>(null);

  const filteredProps = filterEstado === "todos" ? state.proposals : state.proposals.filter((p) => p.estado === filterEstado);
  const totalProposals = state.proposals.filter((p) => p.estado === "aceptado").reduce((a, p) => a + (p.monto_usd || 0), 0);

  function openGenerador(tipo: "cotizacion" | "onboarding" | "planes" | "presupuesto" | "bienvenida", cliente = "") {
    const map = { cotizacion: "cotizador.html", onboarding: "onboarding.html", planes: "planes.html", presupuesto: "presupuesto.html", bienvenida: "bienvenida.html" };
    const titles = { cotizacion: "Cotizador Meteoro", onboarding: "Generador de Onboarding / Bienvenida", planes: "Generador de Planes", presupuesto: "Presupuesto Meteoro", bienvenida: "Carta de Bienvenida Meteoro" };
    const tiposCRM = { cotizacion: "cotizacion", onboarding: "onboarding", planes: "planes", presupuesto: "cotizacion", bienvenida: "onboarding" } as const;
    const params = new URLSearchParams();
    if (cliente) params.set("cliente", cliente);
    const src = `/docs/${map[tipo]}${cliente ? "?" + params.toString() : ""}`;
    const tipoCRM = tiposCRM[tipo];
    setMetaTipo(tipoCRM);
    setOnSaved((payload) => handleGeneradorSaved(payload, tipoCRM));
    openViewer({ src, title: titles[tipo], tipo: tipoCRM });
  }

  function handleGeneradorSaved(payload: Record<string, unknown>, tipo: "cotizacion" | "onboarding" | "planes") {
    setPendingPayload(payload);
    setMetaTipo(tipo);
    setMetaOpen(true);
  }

  async function handleMetaSave(meta: { cliente: string; monto?: number; estado: string; notas: string }) {
    try {
      if (metaTipo === "cotizacion") {
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
      closeViewer();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <div className="space-y-4">
      {/* Métricas */}
      <ProposalMetrics proposals={state.proposals} />

      {/* Botones de generadores */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setPresupuestoOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Presupuesto
        </Button>
        <Button size="sm" variant="outline" onClick={() => setBienvenidaOpen("bienvenida")} className="border-border/50 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Bienvenida
        </Button>
        <Button size="sm" variant="outline" onClick={() => setBienvenidaOpen("onboarding")} className="border-border/50 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Onboarding
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

      {/* Dialog metadata post-save */}
      {metaOpen && (
        <SaveMetaDialog
          open={metaOpen}
          tipo={metaTipo}
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

      {/* Editor de presupuesto */}
      <Dialog open={presupuestoOpen} onOpenChange={(o) => { if (!o) setPresupuestoOpen(false); }}>
        <DialogContent className="bg-card border-border/60 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-heading">Nuevo presupuesto</DialogTitle></DialogHeader>
          <PresupuestoEditor
            nextNumero={calcNextNumero()}
            onSave={async (p) => {
              await saveProposal(p);
              const pData = p.datos as PresupuestoData | null | undefined;
              if (pData?.telefono?.trim()) {
                await saveLead({
                  id: crypto.randomUUID(),
                  nombre: p.cliente,
                  telefono: pData.telefono.trim(),
                  origen: "presupuesto",
                  estado: "calificado",
                  accion: "Presupuesto enviado",
                  notas: "",
                  fase: 1,
                  fecha: p.fecha_envio,
                  temperatura: "caliente",
                });
                const existingCard = state.pipeline.find((c) => c.title === p.cliente);
                if (!existingCard) {
                  const newCard: PipelineCard = {
                    id: crypto.randomUUID(),
                    title: p.cliente,
                    company: p.cliente,
                    owner: "Matías",
                    stage: "in_progress",
                    value_usd: p.monto_usd,
                    next_step: `Seguimiento ${p.proximo_seguimiento ?? ""}`.trim(),
                    notes: p.notas ?? "",
                    updated_at: new Date().toISOString(),
                    labels: [],
                  };
                  await savePipeline([...state.pipeline, newCard]);
                } else if (existingCard.stage !== "in_progress") {
                  const updated = state.pipeline.map((c) =>
                    c.id === existingCard.id ? { ...c, stage: "in_progress" as const, updated_at: new Date().toISOString() } : c
                  );
                  await savePipeline(updated);
                }
              }
              toast.success("Presupuesto guardado");
              setPresupuestoOpen(false);
              // Trigger n8n via proxy server-side (evita CORS)
              fetch("/api/n8n/presupuesto", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  proposalId: p.id,
                  cliente: p.cliente,
                  concepto: p.concepto,
                  monto_usd: p.monto_usd,
                  estado: p.estado,
                  datos: p.datos,
                }),
              }).catch(() => {/* silencioso — no bloquear UI */});
            }}
            onClose={() => setPresupuestoOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Editor de bienvenida / onboarding */}
      <Dialog open={!!bienvenidaOpen} onOpenChange={(o) => { if (!o) setBienvenidaOpen(null); }}>
        <DialogContent className="bg-card border-border/60 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-heading capitalize">{bienvenidaOpen === "onboarding" ? "Nuevo onboarding" : "Nueva carta de bienvenida"}</DialogTitle>
          </DialogHeader>
          {bienvenidaOpen && (
            <BienvenidaEditor
              defaultTipo={bienvenidaOpen}
              onSave={async (d) => { await saveOnboardingDoc(d); toast.success("Documento guardado"); setBienvenidaOpen(null); }}
              onClose={() => setBienvenidaOpen(null)}
            />
          )}
        </DialogContent>
      </Dialog>
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
