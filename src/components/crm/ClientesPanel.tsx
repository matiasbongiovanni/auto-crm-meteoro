"use client";

import { useState } from "react";
import { Plus, Building2, Search, Pencil, Trash2, ChevronRight } from "lucide-react";
import { useCrm } from "@/components/crm/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EmpresaLink } from "@/components/shared/EmpresaLink";
import { mrrDeCliente, mrrTotal, diasARenovacion, healthDeCliente } from "@/lib/clientes";
import { CLIENT_STATUS_CONFIG, CLIENT_HEALTH_CONFIG, BILLING_CYCLE_LABELS, formatUsd } from "@/lib/constants";
import { ClienteDetalle } from "./ClienteDetalle";
import type { Cliente, ClientStatus, BillingCycle } from "@/types/crm";

const BILLING_CYCLES: BillingCycle[] = ["mensual", "trimestral", "anual", "unico"];
const CLIENT_STATUSES: ClientStatus[] = ["activo", "pausado", "churned"];

function ClienteForm({ initial, onSave, onClose }: {
  initial?: Cliente | null;
  onSave: (c: Cliente) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<ClientStatus>(initial?.status || "activo");
  const [cycle, setCycle] = useState<BillingCycle>(initial?.billing_cycle || "mensual");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await onSave({
        id: initial?.id || crypto.randomUUID(),
        nombre: String(fd.get("nombre") || ""),
        empresa: String(fd.get("empresa") || "") || undefined,
        contacto: String(fd.get("contacto") || "") || undefined,
        telefono: String(fd.get("telefono") || "") || undefined,
        email: String(fd.get("email") || "") || undefined,
        status,
        producto: String(fd.get("producto") || ""),
        fee_usd: Number(fd.get("fee_usd") || 0),
        billing_cycle: cycle,
        fecha_alta: String(fd.get("fecha_alta") || new Date().toISOString().slice(0, 10)),
        fecha_renovacion: String(fd.get("fecha_renovacion") || "") || undefined,
        owner: String(fd.get("owner") || "") || undefined,
        contexto_path: String(fd.get("contexto_path") || "") || undefined,
        notas: String(fd.get("notas") || "") || undefined,
        created_at: initial?.created_at,
      });
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1 col-span-2"><Label className="label-muted">Nombre del cliente *</Label>
        <Input name="nombre" defaultValue={initial?.nombre} required className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Empresa</Label>
        <Input name="empresa" defaultValue={initial?.empresa} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Producto / servicio *</Label>
        <Input name="producto" defaultValue={initial?.producto} required className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Fee USD</Label>
        <Input name="fee_usd" type="number" step="0.01" defaultValue={initial?.fee_usd ?? ""} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Ciclo de cobro</Label>
        <Select value={cycle} onValueChange={(v) => setCycle(v as BillingCycle)}>
          <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent>{BILLING_CYCLES.map((c) => <SelectItem key={c} value={c}>{BILLING_CYCLE_LABELS[c]}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label className="label-muted">Estado</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as ClientStatus)}>
          <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent>{CLIENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{CLIENT_STATUS_CONFIG[s].label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label className="label-muted">Alta</Label>
        <Input name="fecha_alta" type="date" defaultValue={initial?.fecha_alta || new Date().toISOString().slice(0, 10)} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Próxima renovación</Label>
        <Input name="fecha_renovacion" type="date" defaultValue={initial?.fecha_renovacion || ""} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Contacto</Label>
        <Input name="contacto" defaultValue={initial?.contacto} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Teléfono</Label>
        <Input name="telefono" defaultValue={initial?.telefono} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Email</Label>
        <Input name="email" type="email" defaultValue={initial?.email} className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Owner</Label>
        <Input name="owner" defaultValue={initial?.owner} placeholder="Mati" className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1 col-span-2"><Label className="label-muted">Ruta contexto</Label>
        <Input name="contexto_path" defaultValue={initial?.contexto_path} placeholder="contexto/clientes/dentalquality.md" className="bg-muted/40 border-border/60 font-mono text-[12px]" /></div>
      <div className="space-y-1 col-span-2"><Label className="label-muted">Notas</Label>
        <textarea name="notas" defaultValue={initial?.notas} rows={3} className="w-full rounded-md bg-muted/40 border border-border/60 px-3 py-2 text-sm text-foreground resize-none outline-none focus:ring-1 focus:ring-primary/30" /></div>
      <div className="col-span-2 flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? "Guardando..." : "Guardar"}</Button>
      </div>
    </form>
  );
}

export function ClientesPanel() {
  const { state, saveCliente, deleteCliente } = useCrm();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterHealth, setFilterHealth] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [detalle, setDetalle] = useState<Cliente | null>(null);

  const clientes = state.clientes.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.nombre.toLowerCase().includes(q) || (c.empresa || "").toLowerCase().includes(q) || (c.producto || "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "todos" || c.status === filterStatus;
    const health = healthDeCliente(c, state.invoices);
    const matchHealth = filterHealth === "todos" || health === filterHealth;
    return matchSearch && matchStatus && matchHealth;
  });

  const activos = state.clientes.filter((c) => c.status === "activo");
  const mrr = mrrTotal(state.clientes);
  const vencidos = state.invoices.filter((i) => i.status === "vencida").length;
  const renovacionProxima = state.clientes.filter((c) => {
    const d = diasARenovacion(c);
    return d !== null && d >= 0 && d <= 14;
  }).length;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Clientes activos", value: String(activos.length), sub: `${state.clientes.length} total` },
          { label: "MRR total", value: formatUsd(mrr), sub: "mensual recurrente" },
          { label: "Renovaciones", value: String(renovacionProxima), sub: "próximos 14 días", alert: renovacionProxima > 0 },
          { label: "Facturas vencidas", value: String(vencidos), sub: "sin cobrar", alert: vencidos > 0 },
        ].map(({ label, value, sub, alert }) => (
          <div key={label} className="metric-card rounded-xl p-4">
            <p className="label-muted mb-1">{label}</p>
            <p className={cn("text-[18px] font-bold tracking-tight", alert ? "text-destructive" : "text-foreground")}>{value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Filtros + acciones */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente..." className="pl-8 bg-muted/40 border-border/60 h-9 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={(v) => { if (v) setFilterStatus(v); }}>
          <SelectTrigger className="w-32 bg-muted/40 border-border/60 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {CLIENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{CLIENT_STATUS_CONFIG[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterHealth} onValueChange={(v) => { if (v) setFilterHealth(v); }}>
          <SelectTrigger className="w-36 bg-muted/40 border-border/60 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Toda salud</SelectItem>
            {["sano", "atencion", "riesgo"].map((h) => <SelectItem key={h} value={h}>{CLIENT_HEALTH_CONFIG[h].label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-9">
          <Plus className="h-3.5 w-3.5" /> Nuevo cliente
        </Button>
      </div>

      {/* Tabla */}
      <div className="metric-card rounded-xl overflow-hidden">
        {clientes.length === 0 ? (
          <div className="py-12 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {state.clientes.length === 0 ? "Sin clientes. Agregá el primero." : "Sin resultados para ese filtro."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border/20">
                  {["Cliente", "Producto", "MRR", "Estado", "Salud", "Renovación", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => {
                  const health = healthDeCliente(c, state.invoices);
                  const healthCfg = CLIENT_HEALTH_CONFIG[health];
                  const statusCfg = CLIENT_STATUS_CONFIG[c.status];
                  const dias = diasARenovacion(c);
                  const mrr = mrrDeCliente(c);
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border/10 last:border-0 hover:bg-white/[0.02] cursor-pointer transition-colors"
                      onClick={() => setDetalle(c)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground/90">{c.nombre}</p>
                        {c.empresa && <EmpresaLink name={c.empresa} muted className="text-[11px]" />}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground">{c.producto || "—"}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground/90">{formatUsd(mrr)}</p>
                        <p className="text-[10px] text-muted-foreground">{BILLING_CYCLE_LABELS[c.billing_cycle]}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[11px] font-semibold", statusCfg?.color)}>{statusCfg?.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full", healthCfg.dot)} />
                          <span className={cn("text-[11px] font-semibold", healthCfg.color)}>{healthCfg.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px]">
                        {dias !== null ? (
                          <span className={cn(dias <= 0 ? "text-destructive" : dias <= 14 ? "text-[var(--warning)]" : "text-muted-foreground")}>
                            {dias <= 0 ? "Vencido" : `${dias}d`}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { setEditing(c); setOpen(true); }} className="p-1 text-muted-foreground hover:text-foreground">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button onClick={async () => { if (!confirm(`¿Eliminar a ${c.nombre}?`)) return; try { await deleteCliente(c.id); toast.success("Eliminado"); } catch { toast.error("Error"); } }} className="p-1 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
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

      {/* Form dialog */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setEditing(null); } }}>
        <DialogContent className="bg-card border-border/60 max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-heading">{editing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          </DialogHeader>
          <ClienteForm
            initial={editing}
            onSave={saveCliente}
            onClose={() => { setOpen(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Detalle drawer */}
      {detalle && <ClienteDetalle cliente={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}
