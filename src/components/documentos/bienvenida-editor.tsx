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
import { defaultBienvenida } from "@/lib/documents/defaults";
import type { BienvenidaData, Paso, Firma, Contacto } from "@/lib/documents/types";
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
  const [notas, setNotas] = useState(doc?.notas ?? "");
  const [data, setData] = useState<BienvenidaData>(
    (doc?.datos as BienvenidaData | null | undefined) ??
      defaultBienvenida(clienteDefault || doc?.cliente || "", doc?.empresa ?? undefined)
  );

  function upd(patch: Partial<BienvenidaData>) {
    setData((d) => ({ ...d, ...patch }));
  }

  // Pasos
  function addPaso() {
    upd({ pasos: [...data.pasos, { numero: data.pasos.length + 1, texto: "" }] });
  }
  function updPaso(idx: number, patch: Partial<Paso>) {
    upd({ pasos: data.pasos.map((p, i) => (i === idx ? { ...p, ...patch } : p)) });
  }
  function removePaso(idx: number) {
    upd({ pasos: data.pasos.filter((_, i) => i !== idx) });
  }

  // Firmas
  function addFirma() {
    upd({ firmas: [...data.firmas, { empresa: "", nombre: "", rol: "", fecha: new Date().toISOString().slice(0, 10) }] });
  }
  function updFirma(idx: number, patch: Partial<Firma>) {
    upd({ firmas: data.firmas.map((f, i) => (i === idx ? { ...f, ...patch } : f)) });
  }
  function removeFirma(idx: number) {
    upd({ firmas: data.firmas.filter((_, i) => i !== idx) });
  }

  // Contactos del equipo
  function addContacto() {
    upd({ equipo: { ...data.equipo, contactos: [...data.equipo.contactos, { label: "", valor: "" }] } });
  }
  function updContacto(idx: number, patch: Partial<Contacto>) {
    upd({ equipo: { ...data.equipo, contactos: data.equipo.contactos.map((c, i) => (i === idx ? { ...c, ...patch } : c)) } });
  }
  function removeContacto(idx: number) {
    upd({ equipo: { ...data.equipo, contactos: data.equipo.contactos.filter((_, i) => i !== idx) } });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        id: doc?.id ?? crypto.randomUUID(),
        cliente: data.header.cliente,
        empresa: data.equipo.titulo ? (data.header.cliente !== data.titulo.titulo ? data.titulo.titulo : null) : null,
        tipo,
        fecha: data.titulo.fecha,
        estado,
        notas,
        datos: data,
        created_at: doc?.created_at,
      } as OnboardingDoc);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <fieldset className="space-y-3">
        <legend className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Encabezado</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="label-muted">Cliente</Label>
            <Input value={data.header.cliente} onChange={(e) => upd({ header: { ...data.header, cliente: e.target.value } })} className="bg-muted/40 border-border/60" />
          </div>
          <div className="space-y-1">
            <Label className="label-muted">Fecha</Label>
            <Input type="date" value={data.titulo.fecha} onChange={(e) => upd({ titulo: { ...data.titulo, fecha: e.target.value } })} className="bg-muted/40 border-border/60" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="label-muted">Título del documento</Label>
            <Input value={data.titulo.titulo} onChange={(e) => upd({ titulo: { ...data.titulo, titulo: e.target.value } })} className="bg-muted/40 border-border/60" />
          </div>
        </div>
      </fieldset>

      {/* Mensaje */}
      <fieldset className="space-y-3">
        <legend className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Mensaje</legend>
        <div className="space-y-1">
          <Label className="label-muted">Saludo</Label>
          <Input value={data.mensaje.saludo} onChange={(e) => upd({ mensaje: { ...data.mensaje, saludo: e.target.value } })} className="bg-muted/40 border-border/60" />
        </div>
        <div className="space-y-1">
          <Label className="label-muted">Cuerpo (separá párrafos con línea en blanco)</Label>
          <Textarea value={data.mensaje.cuerpo} onChange={(e) => upd({ mensaje: { ...data.mensaje, cuerpo: e.target.value } })} rows={5} className="bg-muted/40 border-border/60 resize-none text-[12px]" />
        </div>
      </fieldset>

      {/* Equipo */}
      <fieldset className="space-y-3">
        <legend className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Tu contacto en Meteoro</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="label-muted">Nombre</Label>
            <Input value={data.equipo.nombre} onChange={(e) => upd({ equipo: { ...data.equipo, nombre: e.target.value } })} className="bg-muted/40 border-border/60" />
          </div>
          <div className="space-y-1">
            <Label className="label-muted">Rol</Label>
            <Input value={data.equipo.rol} onChange={(e) => upd({ equipo: { ...data.equipo, rol: e.target.value } })} className="bg-muted/40 border-border/60" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="label-muted">Datos de contacto</Label>
            <Button type="button" size="sm" variant="ghost" className="h-5 text-[9px] gap-0.5" onClick={addContacto}><Plus className="h-2.5 w-2.5" />Agregar</Button>
          </div>
          {data.equipo.contactos.map((c, idx) => (
            <div key={idx} className="flex gap-1 items-center">
              <Input placeholder="Label" value={c.label} onChange={(e) => updContacto(idx, { label: e.target.value })} className="bg-muted/40 border-border/60 text-[11px] h-6 w-24" />
              <Input placeholder="Valor" value={c.valor} onChange={(e) => updContacto(idx, { valor: e.target.value })} className="bg-muted/40 border-border/60 text-[11px] h-6 flex-1" />
              <Button type="button" size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeContacto(idx)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      </fieldset>

      {/* Pasos */}
      <fieldset className="space-y-2">
        <div className="flex items-center justify-between">
          <legend className="text-[10px] font-bold uppercase tracking-widest text-primary">Próximos pasos</legend>
          <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={addPaso}><Plus className="h-3 w-3" />Agregar</Button>
        </div>
        {data.pasos.map((p, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <span className="text-[11px] text-muted-foreground font-bold w-5 text-right shrink-0">{p.numero}</span>
            <Input value={p.texto} onChange={(e) => updPaso(idx, { texto: e.target.value })} placeholder="Descripción del paso" className="bg-muted/40 border-border/60 text-[12px] h-7 flex-1" />
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removePaso(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </fieldset>

      {/* Firmas */}
      <fieldset className="space-y-2">
        <div className="flex items-center justify-between">
          <legend className="text-[10px] font-bold uppercase tracking-widest text-primary">Firmas</legend>
          <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={addFirma}><Plus className="h-3 w-3" />Agregar</Button>
        </div>
        {data.firmas.map((f, idx) => (
          <div key={idx} className="flex gap-2 items-start bg-muted/20 rounded p-2 border border-border/30">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <Input placeholder="Empresa" value={f.empresa} onChange={(e) => updFirma(idx, { empresa: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
              <Input placeholder="Nombre" value={f.nombre} onChange={(e) => updFirma(idx, { nombre: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
              <Input placeholder="Rol" value={f.rol} onChange={(e) => updFirma(idx, { rol: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
              <Input type="date" value={f.fecha} onChange={(e) => updFirma(idx, { fecha: e.target.value })} className="bg-muted/40 border-border/60 text-[12px] h-7" />
            </div>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeFirma(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </fieldset>

      {/* Footer */}
      <fieldset className="space-y-3">
        <legend className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Footer</legend>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="label-muted">Email</Label>
            <Input value={data.footer.email} onChange={(e) => upd({ footer: { ...data.footer, email: e.target.value } })} className="bg-muted/40 border-border/60 text-[12px]" />
          </div>
          <div className="space-y-1">
            <Label className="label-muted">Teléfono</Label>
            <Input value={data.footer.telefono} onChange={(e) => upd({ footer: { ...data.footer, telefono: e.target.value } })} className="bg-muted/40 border-border/60 text-[12px]" />
          </div>
          <div className="space-y-1">
            <Label className="label-muted">Instagram</Label>
            <Input value={data.footer.instagram} onChange={(e) => upd({ footer: { ...data.footer, instagram: e.target.value } })} className="bg-muted/40 border-border/60 text-[12px]" />
          </div>
        </div>
      </fieldset>

      {/* Metadatos CRM */}
      <fieldset className="space-y-3 border-t border-border/30 pt-4">
        <legend className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Metadatos CRM</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="label-muted">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as OnboardingDoc["tipo"])}>
              <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bienvenida">Bienvenida</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
        <DocumentPreview tipo="bienvenida" data={data} open={previewOpen} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
