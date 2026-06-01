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
import { defaultBienvenida, defaultOnboarding } from "@/lib/documents/defaults";
import type { BienvenidaData, OnboardingData, SeccionOnboarding, FaseOnboarding } from "@/lib/documents/types";
import type { OnboardingDoc } from "@/types/crm";

type Props = {
  doc?: OnboardingDoc | null;
  clienteDefault?: string;
  onSave: (d: OnboardingDoc) => Promise<void>;
  onClose: () => void;
};

export function BienvenidaEditor({ doc, clienteDefault = "", onSave, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tipo, setTipo] = useState<OnboardingDoc["tipo"]>(doc?.tipo ?? "bienvenida");
  const [estado, setEstado] = useState<OnboardingDoc["estado"]>(doc?.estado ?? "borrador");
  const [notasCRM, setNotasCRM] = useState(doc?.notas ?? "");

  const cliente = clienteDefault || doc?.cliente || "";
  const empresa = doc?.empresa ?? "";

  const [bienvenidaData, setBienvenidaData] = useState<BienvenidaData>(
    tipo === "bienvenida" && doc?.datos
      ? (doc.datos as BienvenidaData)
      : defaultBienvenida(cliente, empresa)
  );

  const [onboardingData, setOnboardingData] = useState<OnboardingData>(
    tipo === "onboarding" && doc?.datos
      ? (doc.datos as OnboardingData)
      : defaultOnboarding(cliente, empresa)
  );

  // ── Bienvenida helpers ──────────────────────────────────────────────────────
  function updB(patch: Partial<BienvenidaData>) {
    setBienvenidaData((d) => ({ ...d, ...patch }));
  }

  // ── Onboarding helpers ──────────────────────────────────────────────────────
  function updO(patch: Partial<OnboardingData>) {
    setOnboardingData((d) => ({ ...d, ...patch }));
  }

  function updSeccion(idx: number, patch: Partial<SeccionOnboarding>) {
    updO({ secciones: onboardingData.secciones.map((s, i) => (i === idx ? { ...s, ...patch } : s)) });
  }
  function addSeccion() {
    updO({ secciones: [...onboardingData.secciones, { titulo: "", contenido: "" }] });
  }
  function rmSeccion(idx: number) {
    updO({ secciones: onboardingData.secciones.filter((_, i) => i !== idx) });
  }

  function updFase(idx: number, patch: Partial<FaseOnboarding>) {
    updO({ fases: onboardingData.fases.map((f, i) => (i === idx ? { ...f, ...patch } : f)) });
  }
  function addFase() {
    updO({ fases: [...onboardingData.fases, { nombre: "", duracion: "", estado: "pendiente", desc: "" }] });
  }
  function rmFase(idx: number) {
    updO({ fases: onboardingData.fases.filter((_, i) => i !== idx) });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const datos = tipo === "bienvenida" ? bienvenidaData : onboardingData;
      const clienteVal = tipo === "bienvenida" ? bienvenidaData.cliente : onboardingData.cliente;
      const empresaVal = tipo === "bienvenida" ? bienvenidaData.empresa : onboardingData.empresa;
      const fechaVal = tipo === "bienvenida" ? bienvenidaData.fecha : onboardingData.fecha;
      await onSave({
        id: doc?.id ?? crypto.randomUUID(),
        cliente: clienteVal,
        empresa: empresaVal || null,
        tipo,
        fecha: fechaVal,
        estado,
        notas: notasCRM,
        datos,
        created_at: doc?.created_at,
      } as OnboardingDoc);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const previewProps =
    tipo === "bienvenida"
      ? ({ tipo: "bienvenida" as const, data: bienvenidaData })
      : ({ tipo: "onboarding" as const, data: onboardingData });

  return (
    <div className="space-y-6">
      {/* Selector de tipo */}
      <fieldset>
        <legend className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Tipo de documento</legend>
        <div className="flex gap-2">
          {(["bienvenida", "onboarding"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTipo(t)}
              className={`flex-1 py-2 text-[11px] font-semibold rounded border transition-all capitalize ${tipo === t ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-muted-foreground border-border/40 hover:border-border"}`}>
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      {/* ── BIENVENIDA ── */}
      {tipo === "bienvenida" && (
        <>
          <fieldset className="space-y-3">
            <legend className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Cliente</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="label-muted">Nombre del cliente</Label>
                <Input value={bienvenidaData.cliente} onChange={(e) => updB({ cliente: e.target.value })} className="bg-muted/40 border-border/60" />
              </div>
              <div className="space-y-1">
                <Label className="label-muted">Empresa / Organización</Label>
                <Input value={bienvenidaData.empresa} onChange={(e) => updB({ empresa: e.target.value })} className="bg-muted/40 border-border/60" />
              </div>
              <div className="space-y-1">
                <Label className="label-muted">Fecha del documento</Label>
                <Input type="date" value={bienvenidaData.fecha} onChange={(e) => updB({ fecha: e.target.value })} className="bg-muted/40 border-border/60" />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="show-msg" checked={bienvenidaData.showMensaje} onChange={(e) => updB({ showMensaje: e.target.checked })} className="accent-primary" />
              <legend className="text-[10px] font-bold uppercase tracking-widest text-primary cursor-pointer" onClick={() => updB({ showMensaje: !bienvenidaData.showMensaje })}>Mensaje de bienvenida</legend>
            </div>
            {bienvenidaData.showMensaje && (
              <Textarea value={bienvenidaData.mensaje} onChange={(e) => updB({ mensaje: e.target.value })} rows={4} className="bg-muted/40 border-border/60 resize-none text-[12px]" />
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={bienvenidaData.showPortal} onChange={(e) => updB({ showPortal: e.target.checked })} className="accent-primary" />
              <legend className="text-[10px] font-bold uppercase tracking-widest text-primary cursor-pointer" onClick={() => updB({ showPortal: !bienvenidaData.showPortal })}>Portal de clientes</legend>
            </div>
            {bienvenidaData.showPortal && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Input placeholder="URL del portal" value={bienvenidaData.portalUrl} onChange={(e) => updB({ portalUrl: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7 col-span-2" />
                <Input placeholder="Usuario" value={bienvenidaData.portalUser} onChange={(e) => updB({ portalUser: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
                <Input placeholder="Contraseña temporal" value={bienvenidaData.portalPass} onChange={(e) => updB({ portalPass: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={bienvenidaData.showPasos} onChange={(e) => updB({ showPasos: e.target.checked })} className="accent-primary" />
              <legend className="text-[10px] font-bold uppercase tracking-widest text-primary cursor-pointer" onClick={() => updB({ showPasos: !bienvenidaData.showPasos })}>Próximos pasos</legend>
            </div>
            {bienvenidaData.showPasos && (
              <>
                <p className="text-[10px] text-muted-foreground">Un paso por línea. Se numeran automáticamente.</p>
                <Textarea value={bienvenidaData.pasos} onChange={(e) => updB({ pasos: e.target.value })} rows={5} className="bg-muted/40 border-border/60 resize-none text-[12px]" />
              </>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Firma</legend>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Firmante Meteoro" value={bienvenidaData.firmaMeteoro} onChange={(e) => updB({ firmaMeteoro: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
              <Input placeholder="Cargo" value={bienvenidaData.firmaCargo} onChange={(e) => updB({ firmaCargo: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
            </div>
          </fieldset>
        </>
      )}

      {/* ── ONBOARDING ── */}
      {tipo === "onboarding" && (
        <>
          <fieldset className="space-y-3">
            <legend className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Cliente</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="label-muted">Nombre del cliente</Label>
                <Input value={onboardingData.cliente} onChange={(e) => updO({ cliente: e.target.value })} className="bg-muted/40 border-border/60" />
              </div>
              <div className="space-y-1">
                <Label className="label-muted">Empresa</Label>
                <Input value={onboardingData.empresa} onChange={(e) => updO({ empresa: e.target.value })} className="bg-muted/40 border-border/60" />
              </div>
              <div className="space-y-1">
                <Label className="label-muted">Fecha del documento</Label>
                <Input type="date" value={onboardingData.fecha} onChange={(e) => updO({ fecha: e.target.value })} className="bg-muted/40 border-border/60" />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={onboardingData.showResp} onChange={(e) => updO({ showResp: e.target.checked })} className="accent-primary" />
              <legend className="text-[10px] font-bold uppercase tracking-widest text-primary cursor-pointer" onClick={() => updO({ showResp: !onboardingData.showResp })}>Responsables y fechas</legend>
            </div>
            {onboardingData.showResp && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Input placeholder="Responsable cliente" value={onboardingData.respCliente} onChange={(e) => updO({ respCliente: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
                <Input placeholder="Responsable Meteoro" value={onboardingData.respMeteoro} onChange={(e) => updO({ respMeteoro: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
                <div className="space-y-0.5">
                  <Label className="text-[9px] text-muted-foreground">Fecha de inicio</Label>
                  <Input type="date" value={onboardingData.fechaInicio} onChange={(e) => updO({ fechaInicio: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[9px] text-muted-foreground">Entrega estimada</Label>
                  <Input type="date" value={onboardingData.fechaEntrega} onChange={(e) => updO({ fechaEntrega: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
                </div>
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={onboardingData.showSecciones} onChange={(e) => updO({ showSecciones: e.target.checked })} className="accent-primary" />
                <legend className="text-[10px] font-bold uppercase tracking-widest text-primary">Secciones / Accesos</legend>
              </div>
              {onboardingData.showSecciones && <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={addSeccion}><Plus className="h-3 w-3" />Agregar</Button>}
            </div>
            {onboardingData.showSecciones && onboardingData.secciones.map((s, idx) => (
              <div key={idx} className="bg-muted/20 rounded p-2 border border-border/30 space-y-1">
                <div className="flex gap-2 items-center">
                  <Input placeholder="Título de la sección" value={s.titulo} onChange={(e) => updSeccion(idx, { titulo: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7 flex-1" />
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => rmSeccion(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                <Textarea placeholder="Contenido (URL, usuario, contraseña, notas...)" value={s.contenido} onChange={(e) => updSeccion(idx, { contenido: e.target.value })} rows={2} className="bg-muted/40 border-border/60 resize-none text-[12px]" />
              </div>
            ))}
          </fieldset>

          <fieldset className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={onboardingData.showFases} onChange={(e) => updO({ showFases: e.target.checked })} className="accent-primary" />
                <legend className="text-[10px] font-bold uppercase tracking-widest text-primary">Fases del proyecto</legend>
              </div>
              {onboardingData.showFases && <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={addFase}><Plus className="h-3 w-3" />Agregar</Button>}
            </div>
            {onboardingData.showFases && onboardingData.fases.map((f, idx) => (
              <div key={idx} className="bg-muted/20 rounded p-2 border border-border/30 space-y-2">
                <div className="flex gap-2 items-center">
                  <Input placeholder="Nombre de la fase" value={f.nombre} onChange={(e) => updFase(idx, { nombre: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7 flex-1" />
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => rmFase(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Duración" value={f.duracion} onChange={(e) => updFase(idx, { duracion: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7 flex-1" />
                  <Select value={f.estado} onValueChange={(v) => updFase(idx, { estado: (v || f.estado) as FaseOnboarding["estado"] })}>
                    <SelectTrigger className="bg-muted/40 border-border/60 text-[12px] h-7 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="en-curso">En curso</SelectItem>
                      <SelectItem value="completado">Completado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input placeholder="Descripción (opcional)" value={f.desc} onChange={(e) => updFase(idx, { desc: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
              </div>
            ))}
          </fieldset>

          <fieldset className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={onboardingData.showEntregables} onChange={(e) => updO({ showEntregables: e.target.checked })} className="accent-primary" />
              <legend className="text-[10px] font-bold uppercase tracking-widest text-primary">Entregables</legend>
            </div>
            {onboardingData.showEntregables && (
              <Textarea placeholder="Un entregable por línea" value={onboardingData.entregables} onChange={(e) => updO({ entregables: e.target.value })} rows={4} className="bg-muted/40 border-border/60 resize-none text-[12px]" />
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={onboardingData.showCompromisos} onChange={(e) => updO({ showCompromisos: e.target.checked })} className="accent-primary" />
              <legend className="text-[10px] font-bold uppercase tracking-widest text-primary">Compromisos mutuos</legend>
            </div>
            {onboardingData.showCompromisos && (
              <Textarea placeholder="Un compromiso por línea" value={onboardingData.compromisos} onChange={(e) => updO({ compromisos: e.target.value })} rows={4} className="bg-muted/40 border-border/60 resize-none text-[12px]" />
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={onboardingData.showSla} onChange={(e) => updO({ showSla: e.target.checked })} className="accent-primary" />
              <legend className="text-[10px] font-bold uppercase tracking-widest text-primary">SLA y soporte</legend>
            </div>
            {onboardingData.showSla && (
              <Textarea value={onboardingData.sla} onChange={(e) => updO({ sla: e.target.value })} rows={4} className="bg-muted/40 border-border/60 resize-none text-[12px]" />
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Firma</legend>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Firmante Meteoro" value={onboardingData.firmaMeteoro} onChange={(e) => updO({ firmaMeteoro: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
              <Input placeholder="Cargo" value={onboardingData.firmaCargo} onChange={(e) => updO({ firmaCargo: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
            </div>
          </fieldset>
        </>
      )}

      {/* Metadatos CRM */}
      <fieldset className="space-y-3 border-t border-border/30 pt-4">
        <legend className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Metadatos CRM</legend>
        <div className="grid grid-cols-2 gap-3">
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
        <DocumentPreview {...previewProps} open={previewOpen} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
