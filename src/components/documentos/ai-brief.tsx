"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useCrm } from "@/components/crm/provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { DraftDocResult, DraftDocTipo } from "@/lib/ai-prompts";

const PLACEHOLDERS: Record<DraftDocTipo, string> = {
  presupuesto: "Describí el proyecto: qué necesita el cliente, alcance, plazos y, si los tenés, montos. Ej: landing + bot de WhatsApp para clínica dental, setup USD 1200 y USD 200/mes de soporte.",
  bienvenida: "Contá quién es el cliente y qué le vendimos, para redactar el mensaje y los próximos pasos. Ej: clínica estética que contrató el Agente de Turnos.",
  onboarding: "Describí el proyecto y las etapas para armar secciones, fases y entregables. Ej: implementación de bot WhatsApp + CRM para estudio de pilates, arranca esta semana.",
};

const TITLES: Record<DraftDocTipo, string> = {
  presupuesto: "Redactar presupuesto con IA",
  bienvenida: "Redactar bienvenida con IA",
  onboarding: "Redactar onboarding con IA",
};

export function AiBriefDialog({
  open,
  tipo,
  onClose,
  onResult,
}: {
  open: boolean;
  tipo: DraftDocTipo;
  onClose: () => void;
  onResult: (datos: DraftDocResult) => void;
}) {
  const { draftDocumentoAI } = useCrm();
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);

  function handleClose() { setBrief(""); setLoading(false); onClose(); }

  async function handleDraft() {
    if (!brief.trim()) return;
    setLoading(true);
    try {
      const datos = await draftDocumentoAI(tipo, brief.trim());
      onResult(datos);
      toast.success("Borrador generado. Revisá los campos antes de guardar.");
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el borrador");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="bg-card border-border/60 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-heading flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> {TITLES[tipo]}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label className="label-muted">Brief del proyecto</Label>
          <Textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={7}
            placeholder={PLACEHOLDERS[tipo]}
            className="bg-muted/40 border-border/60 resize-none text-[13px]"
          />
          <p className="text-[10px] text-muted-foreground">
            La IA completa el contenido del documento. Los datos de contacto, fecha y firma los mantenés vos.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose}>Cancelar</Button>
            <Button size="sm" disabled={!brief.trim() || loading} onClick={handleDraft}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
              {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Redactando...</> : <><Sparkles className="h-3.5 w-3.5" /> Redactar</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
