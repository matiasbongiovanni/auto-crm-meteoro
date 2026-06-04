"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, RotateCcw } from "lucide-react";
import { useCrm } from "@/components/crm/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { filterByMonth, monthKey, monthlySubscriptionCost, prevMonth, nextMonth, last24Months } from "@/lib/finance";
import type { FinanceRow, Subscription, PendingPayment } from "@/types/crm";
import { FinanceMetrics } from "@/components/dashboard/FinanceMetrics";
import { CobranzasPanel } from "@/components/crm/CobranzasPanel";

const USD_TYPES = ["blue", "oficial", "mep", "ccl", "crypto"];
const FLOW_KINDS_ING = ["mensualidad", "adelanto", "cobro_pendiente", "otro"];
const FLOW_KINDS_EGR = ["operacion", "sueldo", "herramienta", "impuesto", "otro"];
const BILLING_CYCLES = ["mensual", "trimestral", "semestral", "anual"];

function FinanceForm({ kind, initial, onSave, onClose }: {
  kind: "ingreso" | "egreso";
  initial?: FinanceRow;
  onSave: (r: FinanceRow) => Promise<void>;
  onClose: () => void;
}) {
  const [usd, setUsd] = useState(initial?.usd != null ? String(initial.usd) : "");
  const [ars, setArs] = useState(initial?.ars != null ? String(initial.ars) : "");
  const [usdType, setUsdType] = useState(initial?.usd_type || "blue");
  const [saving, setSaving] = useState(false);

  async function applyConversion() {
    const amount = Number(usd);
    if (!amount) return;
    try {
      const res = await fetch(`/api/exchange?type=${usdType}`);
      const data = (await res.json()) as { ok: boolean; venta?: number };
      if (data.ok && data.venta) setArs(String(Math.round(amount * data.venta)));
    } catch { /* manual ARS */ }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await onSave({
        id: initial?.id || crypto.randomUUID(),
        concepto: String(fd.get("concepto") || ""),
        persona: String(fd.get("persona") || ""),
        fecha: String(fd.get("fecha") || new Date().toISOString().slice(0, 10)),
        tipo: kind,
        flow_kind: String(fd.get("flow_kind") || (kind === "ingreso" ? "mensualidad" : "operacion")),
        payment_destination: String(fd.get("payment_destination") || ""),
        usd_type: usdType,
        period_month: String(fd.get("period_month") || new Date().toISOString().slice(0, 7)),
        usd: usd === "" ? null : Number(usd),
        ars: ars === "" ? null : Number(ars),
        eur: fd.get("eur") === "" || fd.get("eur") === null ? null : Number(fd.get("eur")),
        cat: String(fd.get("cat") || ""),
      });
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1 col-span-2"><Label className="label-muted">Concepto</Label>
        <Input name="concepto" defaultValue={initial?.concepto} required className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">{kind === "ingreso" ? "Cliente" : "Proveedor"}</Label>
        <Input name="persona" defaultValue={initial?.persona} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Fecha</Label>
        <Input name="fecha" type="date" defaultValue={initial?.fecha || new Date().toISOString().slice(0, 10)} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Tipo de USD</Label>
        <Select value={usdType} onValueChange={(v) => { if (v) setUsdType(v); }}>
          <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent>{USD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label className="label-muted">Período</Label>
        <Input name="period_month" type="month" defaultValue={initial?.period_month || new Date().toISOString().slice(0, 7)} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">USD</Label>
        <Input value={usd} onChange={(e) => setUsd(e.target.value)} placeholder="0" className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1">
        <div className="flex items-center justify-between"><Label className="label-muted">ARS</Label>
          <button type="button" onClick={applyConversion} className="text-[10px] text-primary hover:underline">
            <RotateCcw className="h-3 w-3 inline mr-0.5" />Convertir
          </button>
        </div>
        <Input value={ars} onChange={(e) => setArs(e.target.value)} placeholder="0" className="bg-muted/40 border-border/60" />
      </div>
      <div className="space-y-1"><Label className="label-muted">Categoría</Label>
        <Select name="flow_kind" defaultValue={initial?.flow_kind || (kind === "ingreso" ? "mensualidad" : "operacion")}>
          <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent>{(kind === "ingreso" ? FLOW_KINDS_ING : FLOW_KINDS_EGR).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label className="label-muted">Destino pago</Label>
        <Input name="payment_destination" defaultValue={initial?.payment_destination} placeholder="Wise / MP..." className="bg-muted/40 border-border/60" /></div>
      <div className="col-span-2 flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

function FinanceSection({ month, setMonth }: { month: string; setMonth: (m: string) => void }) {
  const { state, saveIngreso, deleteIngreso, saveEgreso, deleteEgreso } = useCrm();
  const [open, setOpen] = useState<"ingreso" | "egreso" | null>(null);
  const [editing, setEditing] = useState<{ row: FinanceRow; kind: "ingreso" | "egreso" } | null>(null);

  const ingresos = filterByMonth(state.ingresos, month);
  const egresos = filterByMonth(state.egresos, month);
  const totalIng = ingresos.reduce((a, r) => a + (r.usd || 0), 0);
  const totalEgr = egresos.reduce((a, r) => a + (r.usd || 0), 0);
  const net = totalIng - totalEgr;

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center gap-2">
        <button onClick={() => setMonth(prevMonth(month))} className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground">←</button>
        <select value={month} onChange={(e) => setMonth(e.target.value)}
          className="bg-muted/40 border border-border/60 rounded px-2 py-1 text-sm text-foreground">
          {last24Months().map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={() => setMonth(nextMonth(month))} className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground">→</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Ingresos", value: totalIng, color: "text-[var(--success)]", icon: <TrendingUp className="h-4 w-4" /> },
          { label: "Egresos", value: totalEgr, color: "text-[var(--warning)]", icon: <TrendingDown className="h-4 w-4" /> },
          { label: "Neto", value: net, color: net >= 0 ? "text-[var(--success)]" : "text-destructive", icon: <TrendingUp className="h-4 w-4" /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="metric-card rounded-xl p-4">
            <p className="label-muted mb-2">{label}</p>
            <p className={cn("text-lg font-bold tracking-tight flex items-center gap-1", color)}>
              {icon} USD {value.toFixed(0)}
            </p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setOpen("ingreso")} className="bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20 border border-[var(--success)]/20 gap-1">
          <Plus className="h-3.5 w-3.5" /> Ingreso
        </Button>
        <Button size="sm" onClick={() => setOpen("egreso")} className="bg-[var(--warning)]/10 text-[var(--warning)] hover:bg-[var(--warning)]/20 border border-[var(--warning)]/20 gap-1">
          <Plus className="h-3.5 w-3.5" /> Egreso
        </Button>
      </div>

      {/* Table */}
      {[
        { label: "Ingresos", rows: ingresos, kind: "ingreso" as const, color: "border-t-[var(--success)]" },
        { label: "Egresos", rows: egresos, kind: "egreso" as const, color: "border-t-[var(--warning)]" },
      ].map(({ label, rows, kind, color }) => (
        <div key={kind} className={cn("metric-card rounded-xl overflow-hidden border-t-2", color)}>
          <div className="px-4 py-3 border-b border-border/20">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
          </div>
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">Sin {label.toLowerCase()}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/10 last:border-0 hover:bg-white/[0.01]">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-foreground/80">{row.concepto}</p>
                        {row.persona && <p className="text-[11px] text-muted-foreground">{row.persona}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{row.fecha}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <p className="font-semibold text-foreground/90">USD {row.usd?.toFixed(0) ?? "—"}</p>
                        {row.ars != null && <p className="text-[10px] text-muted-foreground">ARS {row.ars.toLocaleString("es-AR")}</p>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => setEditing({ row, kind })} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                          <button onClick={async () => { try { await (kind === "ingreso" ? deleteIngreso : deleteEgreso)(row.id); toast.success("Eliminado"); } catch { toast.error("Error"); } }} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      <Dialog open={!!open} onOpenChange={(o) => { if (!o) setOpen(null); }}>
        <DialogContent className="bg-card border-border/60 max-w-lg">
          <DialogHeader><DialogTitle className="text-heading">{open === "ingreso" ? "Nuevo ingreso" : "Nuevo egreso"}</DialogTitle></DialogHeader>
          {open && <FinanceForm kind={open} onSave={open === "ingreso" ? saveIngreso : saveEgreso} onClose={() => setOpen(null)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="bg-card border-border/60 max-w-lg">
          <DialogHeader><DialogTitle className="text-heading">Editar {editing?.kind}</DialogTitle></DialogHeader>
          {editing && <FinanceForm kind={editing.kind} initial={editing.row}
            onSave={editing.kind === "ingreso" ? saveIngreso : saveEgreso} onClose={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubscriptionForm({ sub, onSave, onClose }: { sub?: Subscription | null; onSave: (s: Subscription) => Promise<void>; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Subscription["status"]>(sub?.status || "activa");
  const [cycle, setCycle] = useState(sub?.billing_cycle || "mensual");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await onSave({
        id: sub?.id || crypto.randomUUID(),
        name: String(fd.get("name") || ""),
        owner: String(fd.get("owner") || ""),
        category: String(fd.get("category") || ""),
        status,
        billing_cycle: cycle,
        amount_usd: Number(fd.get("amount_usd") || 0),
        renewal_date: String(fd.get("renewal_date") || new Date().toISOString().slice(0, 10)),
        notes: String(fd.get("notes") || ""),
        start_date: String(fd.get("start_date") || "") || undefined,
      });
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1 col-span-2"><Label className="label-muted">Nombre del cliente / servicio</Label>
        <Input name="name" defaultValue={sub?.name} required className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Owner</Label>
        <Input name="owner" defaultValue={sub?.owner} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Categoría</Label>
        <Input name="category" defaultValue={sub?.category} placeholder="Ej. CRM, Landing" className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Monto USD / ciclo</Label>
        <Input name="amount_usd" type="number" step="0.01" defaultValue={sub?.amount_usd} required className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Ciclo</Label>
        <Select value={cycle} onValueChange={(v: string | null) => { if (v) setCycle(v); }}>
          <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent>{BILLING_CYCLES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label className="label-muted">Estado</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as Subscription["status"])}>
          <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent>{["activa","pausada","cancelada"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label className="label-muted">Renovación</Label>
        <Input name="renewal_date" type="date" defaultValue={sub?.renewal_date || new Date().toISOString().slice(0, 10)} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Inicio</Label>
        <Input name="start_date" type="date" defaultValue={sub?.start_date} className="bg-muted/40 border-border/60" /></div>
      <div className="col-span-2 flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? "Guardando..." : "Guardar"}</Button>
      </div>
    </form>
  );
}

function PendingPaymentForm({ payment, onSave, onClose }: { payment?: PendingPayment | null; onSave: (p: PendingPayment) => Promise<void>; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [estado, setEstado] = useState<PendingPayment["estado"]>(payment?.estado || "pendiente");
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await onSave({
        id: payment?.id || crypto.randomUUID(),
        cliente: String(fd.get("cliente") || ""),
        concepto: String(fd.get("concepto") || ""),
        monto_usd: Number(fd.get("monto_usd") || 0),
        fecha_entrega: String(fd.get("fecha_entrega") || new Date().toISOString().slice(0, 10)),
        fecha_vencimiento: String(fd.get("fecha_vencimiento") || "") || null,
        estado,
        notas: String(fd.get("notas") || ""),
        created_at: payment?.created_at || new Date().toISOString(),
      });
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1"><Label className="label-muted">Cliente</Label>
        <Input name="cliente" defaultValue={payment?.cliente} required className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Concepto</Label>
        <Input name="concepto" defaultValue={payment?.concepto} required className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Monto USD</Label>
        <Input name="monto_usd" type="number" step="0.01" defaultValue={payment?.monto_usd ?? ""} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Estado</Label>
        <Select value={estado} onValueChange={(v) => setEstado(v as PendingPayment["estado"])}>
          <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent>{["pendiente","parcial","cobrado"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label className="label-muted">Entrega</Label>
        <Input name="fecha_entrega" type="date" defaultValue={payment?.fecha_entrega || new Date().toISOString().slice(0, 10)} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Vencimiento</Label>
        <Input name="fecha_vencimiento" type="date" defaultValue={payment?.fecha_vencimiento ?? ""} className="bg-muted/40 border-border/60" /></div>
      <div className="col-span-2 flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? "Guardando..." : "Guardar"}</Button>
      </div>
    </form>
  );
}

export default function FinanzasPage() {
  const { state, saveSubscription, savePendingPayment, deletePendingPayment } = useCrm();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [subOpen, setSubOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [editingPay, setEditingPay] = useState<PendingPayment | null>(null);

  const mrr = monthlySubscriptionCost(state.subscriptions, month);

  // Mensualidades automáticas: clientes activos con billing mensual sin ingreso registrado este mes
  const ingresosDelMes = filterByMonth(state.ingresos, month);
  const clientesConIngresoMes = new Set(
    ingresosDelMes.map((r) => r.persona?.toLowerCase().trim()).filter(Boolean)
  );
  const mensualidadesAuto: PendingPayment[] = state.clientes
    .filter((c) => c.status === "activo" && c.billing_cycle === "mensual")
    .filter((c) => !clientesConIngresoMes.has(c.nombre.toLowerCase().trim()))
    .map((c) => ({
      id: `auto-${c.id}`,
      cliente: c.nombre,
      concepto: `Mensualidad ${month}`,
      monto_usd: c.fee_usd,
      fecha_entrega: `${month}-01`,
      fecha_vencimiento: null,
      estado: "pendiente" as const,
      notas: "Generado automáticamente desde Clientes",
      created_at: new Date().toISOString(),
    }));

  // Pagos manuales + auto, excluyendo duplicados por nombre de cliente
  const clientesEnManuales = new Set(
    state.pendingPayments
      .filter((p) => p.estado !== "cobrado")
      .map((p) => p.cliente.toLowerCase().trim())
  );
  const autoFiltrados = mensualidadesAuto.filter(
    (a) => !clientesEnManuales.has(a.cliente.toLowerCase().trim())
  );
  const todosLosPendientes = [...state.pendingPayments, ...autoFiltrados];
  const pendingSum = todosLosPendientes.filter((p) => p.estado !== "cobrado").reduce((a, p) => a + (p.monto_usd || 0), 0);

  return (
    <div className="space-y-6">
      <FinanceMetrics />
      <Tabs defaultValue="finanzas">
        <TabsList className="bg-muted/30 border border-border/40">
          <TabsTrigger value="finanzas" className="text-[12px]">Ingresos / Egresos</TabsTrigger>
          <TabsTrigger value="cobranzas" className="text-[12px]">Cobranzas</TabsTrigger>
          <TabsTrigger value="suscripciones" className="text-[12px]">Suscripciones</TabsTrigger>
          <TabsTrigger value="pagos" className="text-[12px]">Pagos pendientes</TabsTrigger>
        </TabsList>

        <TabsContent value="finanzas" className="mt-4">
          <FinanceSection month={month} setMonth={setMonth} />
        </TabsContent>

        <TabsContent value="cobranzas" className="mt-4">
          <CobranzasPanel />
        </TabsContent>

        <TabsContent value="suscripciones" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="metric-card rounded-xl px-4 py-3 inline-flex items-center gap-2">
              <p className="label-muted">MRR {month}:</p>
              <p className="text-primary font-bold">USD {mrr.toFixed(0)}</p>
            </div>
            <Button size="sm" onClick={() => setSubOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Suscripción
            </Button>
          </div>
          <div className="space-y-2">
            {state.subscriptions.map((sub) => (
              <div key={sub.id} className="metric-card rounded-lg p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground/90">{sub.name}</p>
                  <p className="text-[11px] text-muted-foreground">{sub.category} · {sub.owner} · {sub.billing_cycle}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-primary">USD {sub.amount_usd}</p>
                    <Badge variant="outline" className={cn("text-[10px] mt-0.5",
                      sub.status === "activa" ? "border-[var(--success)]/30 text-[var(--success)]" : "border-border/40 text-muted-foreground")}>
                      {sub.status}
                    </Badge>
                  </div>
                  <button onClick={() => setEditingSub(sub)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
          <Dialog open={subOpen || !!editingSub} onOpenChange={(o) => { if (!o) { setSubOpen(false); setEditingSub(null); } }}>
            <DialogContent className="bg-card border-border/60 max-w-lg">
              <DialogHeader><DialogTitle className="text-heading">{editingSub ? "Editar suscripción" : "Nueva suscripción"}</DialogTitle></DialogHeader>
              <SubscriptionForm sub={editingSub} onSave={saveSubscription} onClose={() => { setSubOpen(false); setEditingSub(null); }} />
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="pagos" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="metric-card rounded-xl px-4 py-3 inline-flex items-center gap-2">
              <p className="label-muted">Por cobrar:</p>
              <p className="text-[var(--warning)] font-bold">USD {pendingSum.toFixed(0)}</p>
            </div>
            <Button size="sm" onClick={() => setPayOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Pago pendiente
            </Button>
          </div>
          <div className="space-y-2">
            {todosLosPendientes.map((p) => {
              const isAuto = p.id.startsWith("auto-");
              return (
                <div key={p.id} className={cn("metric-card rounded-lg p-4 flex items-center justify-between gap-3", p.estado === "cobrado" && "opacity-50")}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground/90">{p.cliente}</p>
                      {isAuto && (
                        <span className="text-[9px] font-semibold uppercase tracking-wide border border-border/40 text-muted-foreground rounded px-1 py-0.5">auto</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{p.concepto} · entrega {p.fecha_entrega}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-[var(--warning)]">USD {p.monto_usd?.toFixed(0) ?? "—"}</p>
                      <Badge variant="outline" className={cn("text-[10px] mt-0.5",
                        p.estado === "cobrado" ? "border-[var(--success)]/30 text-[var(--success)]" :
                          p.estado === "parcial" ? "border-[var(--warning)]/30 text-[var(--warning)]" : "border-border/40 text-muted-foreground")}>
                        {p.estado}
                      </Badge>
                    </div>
                    {!isAuto && (
                      <>
                        <button onClick={() => setEditingPay(p)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={async () => { try { await deletePendingPayment(p.id); toast.success("Eliminado"); } catch { toast.error("Error"); } }} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Dialog open={payOpen || !!editingPay} onOpenChange={(o) => { if (!o) { setPayOpen(false); setEditingPay(null); } }}>
            <DialogContent className="bg-card border-border/60 max-w-md">
              <DialogHeader><DialogTitle className="text-heading">{editingPay ? "Editar pago" : "Nuevo pago pendiente"}</DialogTitle></DialogHeader>
              <PendingPaymentForm payment={editingPay} onSave={savePendingPayment} onClose={() => { setPayOpen(false); setEditingPay(null); }} />
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
