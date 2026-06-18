"use client";

import { useState } from "react";
import { Plus, Trash2, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DocumentPreview } from "./document-preview";
import { AiBriefDialog } from "./ai-brief";
import { defaultPresupuesto } from "@/lib/documents/defaults";
import type { PresupuestoData, ItemCotizacion, PlanMensual } from "@/lib/documents/types";
import type { DraftDocResult } from "@/lib/ai-prompts";
import type { Proposal, ProposalStatus } from "@/types/crm";

const ESTADOS: ProposalStatus[] = ["enviado", "en_negociacion", "aceptado", "rechazado", "vencido"];

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

type Props = {
  proposal?: Proposal | null;
  clienteDefault?: string;
  nextNumero?: string;
  onSave: (p: Proposal) => Promise<void>;
  onClose: () => void;
};

export function PresupuestoEditor({ proposal, clienteDefault = "", nextNumero, onSave, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [estado, setEstado] = useState<ProposalStatus>(proposal?.estado ?? "enviado");

  const isNew = !proposal;
  const initialData = (proposal?.datos as PresupuestoData | null | undefined) ??
    defaultPresupuesto(clienteDefault || proposal?.cliente || "", "", nextNumero ?? "001");

  const [seguimiento, setSeguimiento] = useState(
    proposal?.proximo_seguimiento ?? (isNew ? addDays(initialData.fecha, 5) : "")
  );
  const [link, setLink] = useState(proposal?.link_documento ?? "");
  const [notasCRM, setNotasCRM] = useState(proposal?.notas ?? "");

  const [data, setData] = useState<PresupuestoData>(initialData);

  function upd(patch: Partial<PresupuestoData>) {
    setData((d) => ({ ...d, ...patch }));
  }

  function updItem(idx: number, patch: Partial<ItemCotizacion>) {
    upd({ items: data.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });
  }
  function addItem() {
    upd({ items: [...data.items, { nombre: "", descripcion: "", cantidad: 1, precio: 0 }] });
  }
  function rmItem(idx: number) {
    if (data.items.length === 1) return;
    upd({ items: data.items.filter((_, i) => i !== idx) });
  }

  function updPlan(idx: number, patch: Partial<PlanMensual>) {
    upd({ planes: data.planes.map((p, i) => (i === idx ? { ...p, ...patch } : p)) });
  }
  function addPlan() {
    upd({ planes: [...data.planes, { nombre: "", descripcion: "", precio: 0 }] });
  }
  function rmPlan(idx: number) {
    upd({ planes: data.planes.filter((_, i) => i !== idx) });
  }

  // Aplica el borrador de la IA solo a los campos de contenido (no toca número/fecha/contacto/footer).
  function applyAiDraft(d: DraftDocResult) {
    const patch: Partial<PresupuestoData> = {};
    if (typeof d.proyecto === "string" && d.proyecto.trim()) patch.proyecto = d.proyecto;
    if (d.moneda === "ARS" || d.moneda === "USD" || d.moneda === "EUR") patch.moneda = d.moneda;
    if (typeof d.notas === "string" && d.notas.trim()) patch.notas = d.notas;
    if (Array.isArray(d.items) && d.items.length > 0) {
      patch.items = (d.items as Record<string, unknown>[]).map((it) => ({
        nombre: String(it?.nombre ?? ""),
        descripcion: String(it?.descripcion ?? ""),
        cantidad: Number(it?.cantidad) || 1,
        precio: Number(it?.precio) || 0,
      }));
    }
    if (Array.isArray(d.planes) && d.planes.length > 0) {
      patch.planes = (d.planes as Record<string, unknown>[]).map((p) => ({
        nombre: String(p?.nombre ?? ""),
        descripcion: String(p?.descripcion ?? ""),
        precio: Number(p?.precio) || 0,
      }));
      patch.includePlanes = true;
    }
    if (typeof d.includePlanes === "boolean") patch.includePlanes = d.includePlanes;
    upd(patch);
  }

  const sub = data.items.reduce((a, it) => a + it.cantidad * it.precio, 0);
  const iva = data.incluyeIva ? sub * 0.21 : 0;
  const total = sub + iva;
  const fmtNum = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2 });

  async function handleSave() {
    if (isNew && !data.telefono?.trim()) {
      toast.error("El teléfono del contacto es obligatorio");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: proposal?.id ?? crypto.randomUUID(),
        cliente: data.cliente,
        concepto: data.proyecto,
        monto_usd: total > 0 ? total : null,
        fecha_envio: data.fecha,
        proximo_seguimiento: seguimiento || null,
        estado,
        link_documento: link || null,
        notas: notasCRM,
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
      {/* Redactar con IA */}
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10" onClick={() => setAiOpen(true)}>
          <Sparkles className="h-3.5 w-3.5" /> Redactar con IA
        </Button>
      </div>

      {/* Meta */}
      <fieldset className="space-y-3">
        <legend className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Datos del documento</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="label-muted">Cliente / Empresa</Label>
            <Input value={data.cliente} onChange={(e) => upd({ cliente: e.target.value })} className="bg-muted/40 border-border/60" />
          </div>
          <div className="space-y-1">
            <Label className="label-muted">Título del proyecto</Label>
            <Input value={data.proyecto} onChange={(e) => upd({ proyecto: e.target.value })} className="bg-muted/40 border-border/60" />
          </div>
          <div className="space-y-1">
            <Label className="label-muted">Número</Label>
            <Input value={data.numero} onChange={(e) => upd({ numero: e.target.value })} placeholder="001" className="bg-muted/40 border-border/60" />
          </div>
          <div className="space-y-1">
            <Label className="label-muted">Fecha</Label>
            <Input type="date" value={data.fecha} onChange={(e) => upd({ fecha: e.target.value })} className="bg-muted/40 border-border/60" />
          </div>
          <div className="space-y-1">
            <Label className="label-muted">Moneda</Label>
            <Select value={data.moneda} onValueChange={(v) => upd({ moneda: (v || data.moneda) as PresupuestoData["moneda"] })}>
              <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
              <SelectContent>{["ARS", "USD", "EUR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="label-muted">Validez (días hábiles)</Label>
            <Input type="number" min={1} value={data.validezDias} onChange={(e) => upd({ validezDias: Number(e.target.value) || 15 })} className="bg-muted/40 border-border/60" />
          </div>
          <div className="space-y-1">
            <Label className="label-muted">Teléfono de contacto {isNew && <span className="text-destructive">*</span>}</Label>
            <Input value={data.telefono ?? ""} onChange={(e) => upd({ telefono: e.target.value })} placeholder="+54 9..." className="bg-muted/40 border-border/60" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="label-muted">Preparado por</Label>
            <Input value={data.preparadoPor} onChange={(e) => upd({ preparadoPor: e.target.value })} className="bg-muted/40 border-border/60" />
          </div>
        </div>
      </fieldset>

      {/* Ítems */}
      <fieldset className="space-y-2">
        <div className="flex items-center justify-between">
          <legend className="text-[10px] font-bold uppercase tracking-widest text-primary">Ítems</legend>
          <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={addItem}><Plus className="h-3 w-3" />Agregar</Button>
        </div>
        {data.items.map((it, idx) => (
          <div key={idx} className="bg-muted/20 rounded p-2 border border-border/30 space-y-2">
            <div className="flex gap-2 items-center">
              <Input placeholder="Nombre / Servicio" value={it.nombre} onChange={(e) => updItem(idx, { nombre: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7 flex-1" />
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => rmItem(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
            <Input placeholder="Descripción (opcional)" value={it.descripcion} onChange={(e) => updItem(idx, { descripcion: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
            <div className="flex gap-2 items-center">
              <div className="flex-1 space-y-0.5">
                <Label className="text-[9px] text-muted-foreground">Cant.</Label>
                <Input type="number" min={1} value={it.cantidad} onChange={(e) => updItem(idx, { cantidad: Number(e.target.value) || 1 })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
              </div>
              <div className="flex-1 space-y-0.5">
                <Label className="text-[9px] text-muted-foreground">Precio unit.</Label>
                <Input type="number" min={0} value={it.precio} onChange={(e) => updItem(idx, { precio: Number(e.target.value) || 0 })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
              </div>
              <p className="text-[11px] text-muted-foreground self-end pb-1">= {fmtNum(it.cantidad * it.precio)}</p>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3 flex-wrap pt-1">
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={data.incluyeIva} onChange={(e) => upd({ incluyeIva: e.target.checked })} className="accent-primary" />
            IVA (21%)
          </label>
          <div className="ml-auto text-[12px] font-semibold text-foreground/80 space-x-3">
            {data.incluyeIva && <span className="text-muted-foreground">IVA: {fmtNum(iva)}</span>}
            <span className="text-primary">Total: {fmtNum(total)} {data.moneda}</span>
          </div>
        </div>
      </fieldset>

      {/* Planes */}
      <fieldset className="space-y-2">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={data.includePlanes} onChange={(e) => upd({ includePlanes: e.target.checked })} className="accent-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Incluir planes mensuales</span>
          </label>
          {data.includePlanes && (
            <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] gap-1 ml-auto" onClick={addPlan}><Plus className="h-3 w-3" />Agregar</Button>
          )}
        </div>
        {data.includePlanes && data.planes.map((pl, idx) => (
          <div key={idx} className="bg-muted/20 rounded p-2 border border-border/30 space-y-2">
            <div className="flex gap-2 items-center">
              <Input placeholder="Nombre del plan" value={pl.nombre} onChange={(e) => updPlan(idx, { nombre: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7 flex-1" />
              <Input type="number" min={0} placeholder="Precio" value={pl.precio} onChange={(e) => updPlan(idx, { precio: Number(e.target.value) || 0 })} className="bg-muted/40 border-border/60 text-[12px] h-7 w-28" />
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => rmPlan(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
            <Textarea placeholder="Incluye (un ítem por línea)" value={pl.descripcion} onChange={(e) => updPlan(idx, { descripcion: e.target.value })} rows={3} className="bg-muted/40 border-border/60 text-[12px] resize-none" />
          </div>
        ))}
      </fieldset>

      {/* Notas */}
      <fieldset className="space-y-2">
        <legend className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Notas / Condiciones</legend>
        <Textarea value={data.notas} onChange={(e) => upd({ notas: e.target.value })} rows={3} className="bg-muted/40 border-border/60 resize-none text-[12px]" />
      </fieldset>

      {/* Metadatos CRM */}
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
            <Textarea value={notasCRM} onChange={(e) => setNotasCRM(e.target.value)} rows={2} className="bg-muted/40 border-border/60 resize-none text-[12px]" />
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

      <AiBriefDialog open={aiOpen} tipo="presupuesto" onClose={() => setAiOpen(false)} onResult={applyAiDraft} />
    </div>
  );
}
