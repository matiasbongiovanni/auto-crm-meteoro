"use client";

import { useState } from "react";
import { Plus, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DocumentPreview } from "./document-preview";
import { defaultPresupuesto } from "@/lib/documents/defaults";
import type { PresupuestoData, Item, Plan, MetodoPago, Fase } from "@/lib/documents/types";
import type { Proposal, ProposalStatus } from "@/types/crm";

const ESTADOS: ProposalStatus[] = ["enviado", "en_negociacion", "aceptado", "rechazado", "vencido"];

type Props = {
  proposal?: Proposal | null;
  clienteDefault?: string;
  onSave: (p: Proposal) => Promise<void>;
  onClose: () => void;
};

function calcTotals(data: PresupuestoData) {
  const subtotal = data.items.reduce((s, i) => s + i.cantidad * i.precioUnit, 0);
  const iva = data.mostrarIva ? (subtotal * data.ivaPct) / 100 : 0;
  return { subtotal, iva, total: subtotal + iva };
}

export function PresupuestoEditor({ proposal, clienteDefault = "", onSave, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [estado, setEstado] = useState<ProposalStatus>(proposal?.estado ?? "enviado");
  const [seguimiento, setSeguimiento] = useState(proposal?.proximo_seguimiento ?? "");
  const [link, setLink] = useState(proposal?.link_documento ?? "");
  const [notas, setNotas] = useState(proposal?.notas ?? "");
  const [data, setData] = useState<PresupuestoData>(
    (proposal?.datos as PresupuestoData | null | undefined) ?? defaultPresupuesto(clienteDefault || proposal?.cliente || "")
  );

  function upd(patch: Partial<PresupuestoData>) {
    setData((d) => ({ ...d, ...patch }));
  }

  // Items
  function addItem() {
    upd({ items: [...data.items, { nombre: "", detalle: "", cantidad: 1, precioUnit: 0 }] });
  }
  function updItem(idx: number, patch: Partial<Item>) {
    const next = data.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    upd({ items: next });
  }
  function removeItem(idx: number) {
    upd({ items: data.items.filter((_, i) => i !== idx) });
  }

  // Fases
  function addFase() {
    const n = data.fases.length + 1;
    upd({ fases: [...data.fases, { numero: n, titulo: "", descripcion: "" }] });
  }
  function updFase(idx: number, patch: Partial<Fase>) {
    upd({ fases: data.fases.map((f, i) => (i === idx ? { ...f, ...patch } : f)) });
  }
  function removeFase(idx: number) {
    upd({ fases: data.fases.filter((_, i) => i !== idx) });
  }

  // Planes
  function addPlan() {
    upd({ planes: [...data.planes, { nombre: "", precio: 0, periodo: "/mes", premium: false, features: [""] }] });
  }
  function updPlan(idx: number, patch: Partial<Plan>) {
    upd({ planes: data.planes.map((p, i) => (i === idx ? { ...p, ...patch } : p)) });
  }
  function removePlan(idx: number) {
    upd({ planes: data.planes.filter((_, i) => i !== idx) });
  }
  function updPlanFeatures(planIdx: number, text: string) {
    const features = text.split("\n").map((l) => l.trim()).filter(Boolean);
    updPlan(planIdx, { features: features.length > 0 ? features : [""] });
  }

  // Métodos de pago
  function addMetodo() {
    upd({ metodosPago: [...data.metodosPago, { titulo: "", filas: [{ label: "", valor: "" }] }] });
  }
  function updMetodo(idx: number, patch: Partial<MetodoPago>) {
    upd({ metodosPago: data.metodosPago.map((m, i) => (i === idx ? { ...m, ...patch } : m)) });
  }
  function removeMetodo(idx: number) {
    upd({ metodosPago: data.metodosPago.filter((_, i) => i !== idx) });
  }
  function addMetodoFila(mIdx: number) {
    updMetodo(mIdx, { filas: [...data.metodosPago[mIdx].filas, { label: "", valor: "" }] });
  }
  function updMetodoFila(mIdx: number, fIdx: number, patch: { label?: string; valor?: string }) {
    const filas = data.metodosPago[mIdx].filas.map((f, i) => (i === fIdx ? { ...f, ...patch } : f));
    updMetodo(mIdx, { filas });
  }
  function removeMetodoFila(mIdx: number, fIdx: number) {
    updMetodo(mIdx, { filas: data.metodosPago[mIdx].filas.filter((_, i) => i !== fIdx) });
  }

  const { subtotal, iva, total } = calcTotals(data);
  const fmt = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2 });

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        id: proposal?.id ?? crypto.randomUUID(),
        cliente: data.meta.cliente,
        concepto: data.titulo.titulo,
        monto_usd: total > 0 ? total : null,
        fecha_envio: data.meta.fecha,
        proximo_seguimiento: seguimiento || null,
        estado,
        link_documento: link || null,
        notas,
        datos: data,
        created_at: proposal?.created_at,
      } as Proposal);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Sección: Encabezado / Meta */}
      <fieldset className="space-y-3">
        <legend className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Encabezado</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="label-muted">Cliente</Label>
            <Input value={data.meta.cliente} onChange={(e) => { upd({ meta: { ...data.meta, cliente: e.target.value }, header: { ...data.header, cliente: e.target.value } }); }} className="bg-muted/40 border-border/60" />
          </div>
          <div className="space-y-1">
            <Label className="label-muted">Moneda</Label>
            <Select value={data.meta.moneda} onValueChange={(v) => upd({ meta: { ...data.meta, moneda: v ?? data.meta.moneda } })}>
              <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["ARS", "USD", "EUR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="label-muted">Fecha</Label>
            <Input type="date" value={data.meta.fecha} onChange={(e) => upd({ meta: { ...data.meta, fecha: e.target.value } })} className="bg-muted/40 border-border/60" />
          </div>
          <div className="space-y-1">
            <Label className="label-muted">Preparado por</Label>
            <Input value={data.meta.preparadoPor} onChange={(e) => upd({ meta: { ...data.meta, preparadoPor: e.target.value } })} className="bg-muted/40 border-border/60" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="label-muted">Título del documento</Label>
            <Input value={data.titulo.titulo} onChange={(e) => upd({ titulo: { ...data.titulo, titulo: e.target.value } })} className="bg-muted/40 border-border/60" />
          </div>
        </div>
      </fieldset>

      {/* Sección: Fases */}
      <fieldset className="space-y-2">
        <div className="flex items-center justify-between">
          <legend className="text-[10px] font-bold uppercase tracking-widest text-primary">Fases del proyecto</legend>
          <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={addFase}><Plus className="h-3 w-3" />Agregar</Button>
        </div>
        {data.fases.map((f, idx) => (
          <div key={idx} className="flex gap-2 items-start bg-muted/20 rounded p-2 border border-border/30">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <Input placeholder="Título" value={f.titulo} onChange={(e) => updFase(idx, { titulo: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
              <Input placeholder="Descripción" value={f.descripcion} onChange={(e) => updFase(idx, { descripcion: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
            </div>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeFase(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </fieldset>

      {/* Sección: Ítems */}
      <fieldset className="space-y-2">
        <div className="flex items-center justify-between">
          <legend className="text-[10px] font-bold uppercase tracking-widest text-primary">Ítems / Propuesta económica</legend>
          <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={addItem}><Plus className="h-3 w-3" />Agregar</Button>
        </div>
        {data.items.map((it, idx) => (
          <div key={idx} className="flex gap-2 items-start bg-muted/20 rounded p-2 border border-border/30">
            <div className="flex-1 grid grid-cols-4 gap-2">
              <Input placeholder="Nombre" value={it.nombre} onChange={(e) => updItem(idx, { nombre: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7 col-span-2" />
              <Input placeholder="Detalle" value={it.detalle} onChange={(e) => updItem(idx, { detalle: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7 col-span-2" />
              <Input type="number" placeholder="Cant." min={1} value={it.cantidad} onChange={(e) => updItem(idx, { cantidad: Number(e.target.value) })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
              <Input type="number" placeholder="Precio unit." min={0} value={it.precioUnit} onChange={(e) => updItem(idx, { precioUnit: Number(e.target.value) })} className="bg-muted/40 border-border/60 text-[12px] h-7 col-span-2" />
              <p className="text-[11px] text-muted-foreground self-center">= {fmt(it.cantidad * it.precioUnit)}</p>
            </div>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
        <div className="flex items-center gap-3 flex-wrap pt-1">
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={data.mostrarIva} onChange={(e) => upd({ mostrarIva: e.target.checked })} className="accent-primary" />
            IVA
          </label>
          {data.mostrarIva && (
            <div className="flex items-center gap-1">
              <Input type="number" min={0} max={100} value={data.ivaPct} onChange={(e) => upd({ ivaPct: Number(e.target.value) })} className="bg-muted/40 border-border/60 text-[12px] h-6 w-16" />
              <span className="text-[11px] text-muted-foreground">%</span>
            </div>
          )}
          <div className="ml-auto text-[12px] font-semibold text-foreground/80 space-x-4">
            <span>Sub: {fmt(subtotal)}</span>
            {data.mostrarIva && <span>IVA: {fmt(iva)}</span>}
            <span className="text-primary">Total: {fmt(total)} {data.meta.moneda}</span>
          </div>
        </div>
      </fieldset>

      {/* Sección: Planes */}
      <fieldset className="space-y-2">
        <div className="flex items-center justify-between">
          <legend className="text-[10px] font-bold uppercase tracking-widest text-primary">Planes de mantenimiento</legend>
          <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={addPlan}><Plus className="h-3 w-3" />Agregar</Button>
        </div>
        {data.planes.map((p, idx) => (
          <div key={idx} className="bg-muted/20 rounded p-2 border border-border/30 space-y-2">
            <div className="flex gap-2 items-center">
              <Input placeholder="Nombre del plan" value={p.nombre} onChange={(e) => updPlan(idx, { nombre: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7 flex-1" />
              <Input type="number" placeholder="Precio" value={p.precio} onChange={(e) => updPlan(idx, { precio: Number(e.target.value) })} className="bg-muted/40 border-border/60 text-[12px] h-7 w-24" />
              <Input placeholder="Período" value={p.periodo} onChange={(e) => updPlan(idx, { periodo: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7 w-16" />
              <label className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 cursor-pointer">
                <input type="checkbox" checked={p.premium} onChange={(e) => updPlan(idx, { premium: e.target.checked })} className="accent-primary" />
                Premium
              </label>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removePlan(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
            <Textarea
              placeholder="Features (una por línea)"
              value={p.features.join("\n")}
              onChange={(e) => updPlanFeatures(idx, e.target.value)}
              rows={3}
              className="bg-muted/40 border-border/60 text-[12px] resize-none"
            />
          </div>
        ))}
      </fieldset>

      {/* Sección: Métodos de pago */}
      <fieldset className="space-y-2">
        <div className="flex items-center justify-between">
          <legend className="text-[10px] font-bold uppercase tracking-widest text-primary">Métodos de pago</legend>
          <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={addMetodo}><Plus className="h-3 w-3" />Agregar</Button>
        </div>
        {data.metodosPago.map((mp, mIdx) => (
          <div key={mIdx} className="bg-muted/20 rounded p-2 border border-border/30 space-y-2">
            <div className="flex gap-2 items-center">
              <Input placeholder="Título del método" value={mp.titulo} onChange={(e) => updMetodo(mIdx, { titulo: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7 flex-1" />
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeMetodo(mIdx)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
            {mp.filas.map((fila, fIdx) => (
              <div key={fIdx} className="flex gap-1 items-center">
                <Input placeholder="Label" value={fila.label} onChange={(e) => updMetodoFila(mIdx, fIdx, { label: e.target.value })} className="bg-muted/40 border-border/60 text-[11px] h-6 w-28" />
                <Input placeholder="Valor" value={fila.valor} onChange={(e) => updMetodoFila(mIdx, fIdx, { valor: e.target.value })} className="bg-muted/40 border-border/60 text-[11px] h-6 flex-1" />
                <Button type="button" size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeMetodoFila(mIdx, fIdx)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="ghost" className="h-5 text-[9px] gap-0.5" onClick={() => addMetodoFila(mIdx)}><Plus className="h-2.5 w-2.5" />Fila</Button>
          </div>
        ))}
      </fieldset>

      {/* Sección: Notas / Validez / Footer */}
      <fieldset className="space-y-3">
        <legend className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Notas y condiciones</legend>
        <div className="space-y-1">
          <Label className="label-muted">Notas</Label>
          <Textarea value={data.notas} onChange={(e) => upd({ notas: e.target.value })} rows={3} className="bg-muted/40 border-border/60 resize-none text-[12px]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="label-muted">Validez</Label>
            <Input value={data.validez} onChange={(e) => upd({ validez: e.target.value })} className="bg-muted/40 border-border/60" />
          </div>
          <div className="space-y-1">
            <Label className="label-muted">Footer — Email</Label>
            <Input value={data.footer.email} onChange={(e) => upd({ footer: { ...data.footer, email: e.target.value } })} className="bg-muted/40 border-border/60" />
          </div>
        </div>
      </fieldset>

      {/* Sección: Metadatos del CRM */}
      <fieldset className="space-y-3 border-t border-border/30 pt-4">
        <legend className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Metadatos CRM</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="label-muted">Estado</Label>
            <Select value={estado} onValueChange={(v) => setEstado(v as ProposalStatus)}>
              <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
              <SelectContent>{ESTADOS.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="label-muted">Próx. seguimiento</Label>
            <Input type="date" value={seguimiento} onChange={(e) => setSeguimiento(e.target.value)} className="bg-muted/40 border-border/60" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="label-muted">Link externo (opcional)</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." className="bg-muted/40 border-border/60" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="label-muted">Notas internas</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="bg-muted/40 border-border/60 resize-none text-[12px]" />
          </div>
        </div>
      </fieldset>

      <div className="flex justify-between items-center pt-2">
        <Button type="button" variant="outline" size="sm" className="gap-1.5 border-border/50" onClick={() => setPreviewOpen(true)}>
          <Eye className="h-3.5 w-3.5" /> Vista previa
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button type="button" size="sm" disabled={saving} onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {previewOpen && (
        <DocumentPreview tipo="presupuesto" data={data} open={previewOpen} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
