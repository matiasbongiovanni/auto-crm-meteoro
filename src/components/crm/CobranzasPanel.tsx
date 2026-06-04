"use client";

import { useState } from "react";
import { Plus, CheckCircle2, XCircle, FileText, AlertCircle, RefreshCw, Pencil } from "lucide-react";
import { useCrm } from "@/components/crm/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { invoicesDelMes, totalCobrado, totalPorCobrar, totalVencido } from "@/lib/clientes";
import { INVOICE_STATUS_CONFIG, formatUsd, formatDate } from "@/lib/constants";
import { last24Months, prevMonth, nextMonth } from "@/lib/finance";
import { renderFactura } from "@/lib/documents/render-factura";
import type { Invoice, InvoiceStatus } from "@/types/crm";

function InvoiceForm({ clientes, initial, onSave, onClose }: {
  clientes: { id: string; nombre: string; fee_usd: number }[];
  initial?: Invoice | null;
  onSave: (inv: Invoice) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<InvoiceStatus>(initial?.status || "pendiente");
  const [clienteId, setClienteId] = useState(initial?.cliente_id || "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!clienteId) { toast.error("Seleccioná un cliente"); return; }
    setSaving(true);
    try {
      await onSave({
        id: initial?.id || crypto.randomUUID(),
        cliente_id: clienteId,
        concepto: String(fd.get("concepto") || ""),
        period_month: String(fd.get("period_month") || new Date().toISOString().slice(0, 7)),
        monto_usd: Number(fd.get("monto_usd") || 0),
        status,
        fecha_emision: String(fd.get("fecha_emision") || new Date().toISOString().slice(0, 10)),
        fecha_vencimiento: String(fd.get("fecha_vencimiento") || new Date().toISOString().slice(0, 10)),
        notas: String(fd.get("notas") || "") || undefined,
        created_at: initial?.created_at,
      });
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); } finally { setSaving(false); }
  }

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1 col-span-2">
        <Label className="label-muted">Cliente *</Label>
        <Select value={clienteId} onValueChange={(v) => { if (v) setClienteId(v); }}>
          <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue placeholder="Seleccioná un cliente" /></SelectTrigger>
          <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1 col-span-2"><Label className="label-muted">Concepto</Label>
        <Input name="concepto" defaultValue={initial?.concepto || (clienteSeleccionado ? `Mensualidad - ${clienteSeleccionado.nombre}` : "")} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Período</Label>
        <Input name="period_month" type="month" defaultValue={initial?.period_month || new Date().toISOString().slice(0, 7)} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Monto USD</Label>
        <Input name="monto_usd" type="number" step="0.01" defaultValue={initial?.monto_usd ?? clienteSeleccionado?.fee_usd ?? ""} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Fecha emisión</Label>
        <Input name="fecha_emision" type="date" defaultValue={initial?.fecha_emision || new Date().toISOString().slice(0, 10)} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Fecha vencimiento</Label>
        <Input name="fecha_vencimiento" type="date" defaultValue={initial?.fecha_vencimiento || ""} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Estado</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
          <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent>{(["pendiente", "pagada", "vencida", "anulada"] as InvoiceStatus[]).map((s) => <SelectItem key={s} value={s}>{INVOICE_STATUS_CONFIG[s].label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="col-span-2 flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? "Guardando..." : "Guardar"}</Button>
      </div>
    </form>
  );
}

type PendingFilter = "por_cobrar" | "vencido" | "cobrado";

function PendingPaymentsSection() {
  const { state, savePendingPayment, deletePendingPayment } = useCrm();
  const [filter, setFilter] = useState<PendingFilter>("por_cobrar");
  const [editingPay, setEditingPay] = useState<import("@/types/crm").PendingPayment | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const all = state.pendingPayments;
  if (all.length === 0) return null;

  const vencidos = all.filter((p) => p.estado !== "cobrado" && p.fecha_vencimiento && new Date(p.fecha_vencimiento + "T00:00:00") < today);
  const cobrados = all.filter((p) => p.estado === "cobrado");
  const porCobrar = all.filter((p) => p.estado !== "cobrado" && (!p.fecha_vencimiento || new Date(p.fecha_vencimiento + "T00:00:00") >= today));

  const groups: Record<PendingFilter, typeof all> = { por_cobrar: porCobrar, vencido: vencidos, cobrado: cobrados };
  const items = groups[filter];

  const FILTER_LABELS: Record<PendingFilter, { label: string; count: number; color: string }> = {
    por_cobrar: { label: "Por cobrar", count: porCobrar.length, color: filter === "por_cobrar" ? "text-[var(--warning)]" : "text-muted-foreground" },
    vencido: { label: "Vencido", count: vencidos.length, color: filter === "vencido" ? "text-destructive" : "text-muted-foreground" },
    cobrado: { label: "Cobrado", count: cobrados.length, color: filter === "cobrado" ? "text-[var(--success)]" : "text-muted-foreground" },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pagos pendientes</p>
        <Button size="sm" onClick={() => setPayOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-7 text-[11px]">
          <Plus className="h-3 w-3" /> Pago
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-1">
        {(["por_cobrar", "vencido", "cobrado"] as PendingFilter[]).map((f) => {
          const cfg = FILTER_LABELS[f];
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-2.5 py-1 rounded text-[10px] font-semibold border transition-all",
                filter === f ? "bg-muted/60 border-border/40" : "border-transparent hover:bg-muted/30",
                cfg.color)}>
              {cfg.label} {cfg.count > 0 && <span className="ml-0.5 opacity-60">({cfg.count})</span>}
            </button>
          );
        })}
      </div>

      {/* Lista */}
      <div className="metric-card rounded-xl overflow-hidden">
        {items.length === 0 ? (
          <p className="px-4 py-5 text-sm text-muted-foreground text-center">Sin items en esta categoría</p>
        ) : (
          <div className="divide-y divide-border/10">
            {items.map((p) => (
              <div key={p.id} className={cn("flex items-center justify-between gap-3 px-4 py-2.5", p.estado === "cobrado" && "opacity-50")}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground/80 text-sm truncate">{p.cliente}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{p.concepto}{p.fecha_vencimiento ? ` · vence ${p.fecha_vencimiento}` : ""}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="font-bold text-[var(--warning)] text-sm">USD {p.monto_usd?.toFixed(0) ?? "—"}</p>
                  <button onClick={() => { setEditingPay(p); setPayOpen(true); }} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                  <button onClick={async () => { try { await deletePendingPayment(p.id); } catch { /* silent */ } }} className="p-1 text-muted-foreground hover:text-destructive"><XCircle className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form dialog — reutilizamos el inline */}
      <PendingPaymentInlineDialog
        open={payOpen}
        payment={editingPay}
        onSave={savePendingPayment}
        onClose={() => { setPayOpen(false); setEditingPay(null); }}
      />
    </div>
  );
}

function PendingPaymentInlineDialog({
  open,
  payment,
  onSave,
  onClose,
}: {
  open: boolean;
  payment: import("@/types/crm").PendingPayment | null;
  onSave: (p: import("@/types/crm").PendingPayment) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [estado, setEstado] = useState<import("@/types/crm").PendingPaymentStatus>(payment?.estado ?? "pendiente");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await onSave({
        id: payment?.id ?? crypto.randomUUID(),
        cliente: String(fd.get("cliente") ?? ""),
        concepto: String(fd.get("concepto") ?? ""),
        monto_usd: Number(fd.get("monto_usd") ?? 0),
        fecha_entrega: String(fd.get("fecha_entrega") ?? new Date().toISOString().slice(0, 10)),
        fecha_vencimiento: String(fd.get("fecha_vencimiento") ?? "") || null,
        estado,
        notas: "",
        created_at: payment?.created_at ?? new Date().toISOString(),
      });
      onClose();
    } catch { /* silent */ } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-card border-border/60 max-w-md">
        <DialogHeader><DialogTitle className="text-heading">{payment ? "Editar pago" : "Nuevo pago pendiente"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1"><Label className="label-muted">Cliente</Label>
            <Input name="cliente" defaultValue={payment?.cliente} required className="bg-muted/40 border-border/60" /></div>
          <div className="space-y-1"><Label className="label-muted">Concepto</Label>
            <Input name="concepto" defaultValue={payment?.concepto} required className="bg-muted/40 border-border/60" /></div>
          <div className="space-y-1"><Label className="label-muted">Monto USD</Label>
            <Input name="monto_usd" type="number" step="0.01" defaultValue={payment?.monto_usd ?? ""} className="bg-muted/40 border-border/60" /></div>
          <div className="space-y-1"><Label className="label-muted">Estado</Label>
            <Select value={estado} onValueChange={(v) => setEstado(v as import("@/types/crm").PendingPaymentStatus)}>
              <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
              <SelectContent>{["pendiente", "parcial", "cobrado"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="label-muted">Entrega</Label>
            <Input name="fecha_entrega" type="date" defaultValue={payment?.fecha_entrega ?? new Date().toISOString().slice(0, 10)} className="bg-muted/40 border-border/60" /></div>
          <div className="space-y-1"><Label className="label-muted">Vencimiento</Label>
            <Input name="fecha_vencimiento" type="date" defaultValue={payment?.fecha_vencimiento ?? ""} className="bg-muted/40 border-border/60" /></div>
          <div className="col-span-2 flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CobranzasPanel() {
  const { state, saveInvoice, deleteInvoice, markInvoicePaid, generateMonthlyInvoices } = useCrm();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [generating, setGenerating] = useState(false);

  const mesInvoices = invoicesDelMes(state.invoices, month);
  const cobrado = totalCobrado(state.invoices, month);
  const porCobrar = totalPorCobrar(state.invoices, month);
  const vencido = totalVencido(state.invoices);

  const clientesActivos = state.clientes
    .filter((c) => c.status === "activo")
    .map((c) => ({ id: c.id, nombre: c.nombre, fee_usd: c.fee_usd }));

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await generateMonthlyInvoices(month);
      toast.success(`${result.created} factura(s) generada(s) para ${month}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); } finally { setGenerating(false); }
  }

  function clienteNombre(clienteId: string) {
    return state.clientes.find((c) => c.id === clienteId)?.nombre || "—";
  }

  function handlePdf(invoice: Invoice) {
    const html = renderFactura({ invoice, clienteNombre: clienteNombre(invoice.cliente_id) });
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  }

  return (
    <div className="space-y-5">
      {/* Totales */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Cobrado", value: cobrado, color: "text-[var(--success)]" },
          { label: "Por cobrar", value: porCobrar, color: "text-[var(--warning)]" },
          { label: "Vencido (total)", value: vencido, color: vencido > 0 ? "text-destructive" : "text-muted-foreground" },
        ].map(({ label, value, color }) => (
          <div key={label} className="metric-card rounded-xl p-4">
            <p className="label-muted mb-2">{label}</p>
            <p className={cn("text-[18px] font-bold tracking-tight", color)}>{formatUsd(value)}</p>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setMonth(prevMonth(month))} className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground">←</button>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="bg-muted/40 border border-border/60 rounded px-2 py-1 text-sm text-foreground">
            {last24Months().map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={() => setMonth(nextMonth(month))} className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground">→</button>
        </div>
        <Button size="sm" onClick={handleGenerate} disabled={generating} variant="outline" className="gap-1.5 h-9 border-border/60 text-foreground/70">
          <RefreshCw className={cn("h-3.5 w-3.5", generating && "animate-spin")} />
          Generar mes
        </Button>
        <Button size="sm" onClick={() => setOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-9 ml-auto">
          <Plus className="h-3.5 w-3.5" /> Factura
        </Button>
      </div>

      {/* Tabla de facturas */}
      <div className="metric-card rounded-xl overflow-hidden">
        {mesInvoices.length === 0 ? (
          <div className="py-10 text-center">
            <AlertCircle className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin facturas para {month}. Usá &ldquo;Generar mes&rdquo; para crear las mensuales.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-border/20">
                  {["Cliente", "Concepto", "Monto", "Estado", "Vencimiento", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mesInvoices.map((inv) => {
                  const cfg = INVOICE_STATUS_CONFIG[inv.status];
                  return (
                    <tr key={inv.id} className="border-b border-border/10 last:border-0 hover:bg-white/[0.01]">
                      <td className="px-4 py-2.5 font-medium text-foreground/80">{clienteNombre(inv.cliente_id)}</td>
                      <td className="px-4 py-2.5 text-[12px] text-muted-foreground max-w-[160px] truncate">{inv.concepto}</td>
                      <td className="px-4 py-2.5 font-semibold text-foreground/90">{formatUsd(inv.monto_usd)}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-[11px] font-semibold uppercase tracking-wide", cfg?.color)}>{cfg?.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-muted-foreground whitespace-nowrap">{formatDate(new Date(inv.fecha_vencimiento))}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 justify-end">
                          {(inv.status === "pendiente" || inv.status === "vencida") && (
                            <button onClick={async () => { try { await markInvoicePaid(inv.id); toast.success("Pagada"); } catch { toast.error("Error"); } }} className="p-1 text-muted-foreground hover:text-[var(--success)]" title="Marcar pagada">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => handlePdf(inv)} className="p-1 text-muted-foreground hover:text-foreground" title="PDF">
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => { setEditing(inv); setOpen(true); }} className="p-1 text-muted-foreground hover:text-foreground" title="Editar">
                            <XCircle className="h-3.5 w-3.5 rotate-45" />
                          </button>
                          <button onClick={async () => { if (!confirm("¿Eliminar esta factura?")) return; try { await deleteInvoice(inv.id); toast.success("Eliminada"); } catch { toast.error("Error"); } }} className="p-1 text-muted-foreground hover:text-destructive" title="Eliminar">
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setEditing(null); } }}>
        <DialogContent className="bg-card border-border/60 max-w-lg">
          <DialogHeader><DialogTitle className="text-heading">{editing ? "Editar factura" : "Nueva factura"}</DialogTitle></DialogHeader>
          <InvoiceForm
            clientes={clientesActivos}
            initial={editing}
            onSave={saveInvoice}
            onClose={() => { setOpen(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Pagos pendientes */}
      <PendingPaymentsSection />
    </div>
  );
}
