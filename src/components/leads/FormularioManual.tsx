"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCrm } from "@/components/crm/provider";
import { toast } from "sonner";
import type { Lead } from "@/types/crm";

const NICHOS = ["automatizacion", "inmobiliaria", "ecommerce", "clinica", "otro"];

export function FormularioManual() {
  const { saveLead } = useCrm();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const telefono = String(fd.get("telefono") || "").trim();
    if (!telefono) {
      toast.error("El teléfono es obligatorio");
      return;
    }
    const nombre = String(fd.get("nombre") || "").trim();
    if (!nombre) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const lead: Lead = {
        id: crypto.randomUUID(),
        nombre,
        telefono,
        email: String(fd.get("email") || "") || undefined,
        empresa: String(fd.get("empresa") || "") || undefined,
        notas: String(fd.get("notas") || ""),
        origen: "formulario",
        estado: "nuevo",
        accion: "",
        fase: 1,
        fecha: new Date().toISOString().slice(0, 10),
        temperatura: "frio",
        canal_contacto: "whatsapp",
        nicho: String(fd.get("nicho") || "") || undefined,
        ciudad: String(fd.get("ciudad") || "") || undefined,
        pais: String(fd.get("pais") || "") || undefined,
      };
      await saveLead(lead);
      toast.success("Lead agregado");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input id="nombre" name="nombre" placeholder="Juan Pérez" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="telefono">
            Teléfono <span className="text-destructive">*</span>
          </Label>
          <Input id="telefono" name="telefono" placeholder="+5491112345678" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="empresa">Empresa</Label>
          <Input id="empresa" name="empresa" placeholder="Nombre del negocio" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="juan@empresa.com" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nicho">Nicho</Label>
          <Select name="nicho">
            <SelectTrigger id="nicho">
              <SelectValue placeholder="Seleccioná" />
            </SelectTrigger>
            <SelectContent>
              {NICHOS.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ciudad">Ciudad</Label>
          <Input id="ciudad" name="ciudad" placeholder="Buenos Aires" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pais">País</Label>
          <Input id="pais" name="pais" placeholder="Argentina" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notas">Notas</Label>
        <Textarea id="notas" name="notas" rows={3} placeholder="Contexto del prospecto..." />
      </div>

      <Button type="submit" disabled={saving} className="w-full">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Agregar lead
      </Button>
    </form>
  );
}
