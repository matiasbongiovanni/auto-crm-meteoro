"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { useCrm } from "@/components/crm/provider";
import { STATE_KEYS } from "@/lib/constants";
import { DEFAULT_METAS } from "@/lib/metas";
import type { Meta, MetaTipo, MetaUnidad } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const TIPO_LABELS: Record<MetaTipo, string> = {
  cash_collect: "Cash collect (USD cobrado)",
  ventas_servicio: "Ventas de servicios (clientes nuevos)",
  ventas_producto: "Ventas de un producto",
  custom: "Manual",
};

function newMeta(): Meta {
  return {
    id: (globalThis.crypto?.randomUUID?.() ?? `meta-${Date.now()}`),
    label: "Nueva meta",
    tipo: "custom",
    target: 0,
    unidad: "cantidad",
  };
}

export function SettingsForm() {
  const { state, saveSharedState } = useCrm();
  const s = state.settings;

  const [metas, setMetas] = useState<Meta[]>(s.metas || []);
  const [hideGoal, setHideGoal] = useState(s.hideGoalAmount);
  const [hiddenByDefault, setHiddenByDefault] = useState(s.revenueHiddenByDefault);
  const [ceoNote, setCeoNote] = useState(s.ceoNote || "");
  const [scope, setScope] = useState<"7d" | "30d" | "90d">(s.dashboardScope || "30d");
  const [saving, setSaving] = useState(false);

  function updateMeta(id: string, patch: Partial<Meta>) {
    setMetas((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const next = {
        ...s,
        metas,
        hideGoalAmount: hideGoal,
        revenueHiddenByDefault: hiddenByDefault,
        ceoNote,
        dashboardScope: scope,
      };
      await saveSharedState(STATE_KEYS.settings, next);
      toast.success("Configuración guardada");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="label-muted">Metas del mes</Label>
          <button
            type="button"
            onClick={() => setMetas(DEFAULT_METAS)}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Restaurar sugeridas
          </button>
        </div>

        {metas.length === 0 && (
          <p className="text-[11px] text-muted-foreground">Sin metas. Agregá una o restaurá las sugeridas.</p>
        )}

        <div className="space-y-3">
          {metas.map((m) => (
            <div key={m.id} className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={m.label}
                  onChange={(e) => updateMeta(m.id, { label: e.target.value })}
                  placeholder="Nombre de la meta"
                  className="bg-muted/40 border-border/60 h-8 text-[13px]"
                />
                <button
                  type="button"
                  onClick={() => setMetas((prev) => prev.filter((x) => x.id !== m.id))}
                  className="text-muted-foreground hover:text-destructive shrink-0 p-1.5"
                  title="Borrar meta"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1 sm:col-span-1">
                  <Label className="label-muted text-[10px]">Tipo</Label>
                  <Select value={m.tipo} onValueChange={(v) => updateMeta(m.id, { tipo: v as MetaTipo, unidad: v === "cash_collect" ? "usd" : m.unidad })}>
                    <SelectTrigger className="bg-muted/40 border-border/60 h-8 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TIPO_LABELS) as MetaTipo[]).map((t) => (
                        <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="label-muted text-[10px]">Target</Label>
                  <Input
                    type="number"
                    min={0}
                    value={String(m.target ?? "")}
                    onChange={(e) => updateMeta(m.id, { target: e.target.value === "" ? 0 : Number(e.target.value) })}
                    className="bg-muted/40 border-border/60 h-8 text-[12px]"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="label-muted text-[10px]">Unidad</Label>
                  <Select value={m.unidad} onValueChange={(v) => updateMeta(m.id, { unidad: v as MetaUnidad })}>
                    <SelectTrigger className="bg-muted/40 border-border/60 h-8 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD</SelectItem>
                      <SelectItem value="cantidad">Cantidad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {m.tipo === "ventas_producto" && (
                <div className="space-y-1">
                  <Label className="label-muted text-[10px]">Filtro de producto (substring)</Label>
                  <Input
                    value={m.productoMatch || ""}
                    onChange={(e) => updateMeta(m.id, { productoMatch: e.target.value })}
                    placeholder='ej. "anti baneo"'
                    className="bg-muted/40 border-border/60 h-8 text-[12px]"
                  />
                </div>
              )}

              {m.tipo === "custom" && (
                <div className="space-y-1">
                  <Label className="label-muted text-[10px]">Progreso manual</Label>
                  <Input
                    type="number"
                    min={0}
                    value={String(m.manual ?? "")}
                    onChange={(e) => updateMeta(m.id, { manual: e.target.value === "" ? 0 : Number(e.target.value) })}
                    className="bg-muted/40 border-border/60 h-8 text-[12px]"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="label-muted text-[10px]">Subtítulo (opcional)</Label>
                <Input
                  value={m.subtitulo || ""}
                  onChange={(e) => updateMeta(m.id, { subtitulo: e.target.value })}
                  placeholder="ej. USD 125 setup + USD 30/mes"
                  className="bg-muted/40 border-border/60 h-8 text-[12px]"
                />
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMetas((prev) => [...prev, newMeta()])}
          className="gap-1.5"
        >
          <Plus className="size-3.5" /> Agregar meta
        </Button>
      </div>

      <Toggle
        label="Ocultar monto de la meta"
        description="Muestra solo el porcentaje (sin USD)"
        checked={hideGoal}
        onChange={setHideGoal}
      />

      <Toggle
        label="Revenue oculto por defecto"
        description="El dashboard arranca con los números en blur"
        checked={hiddenByDefault}
        onChange={setHiddenByDefault}
      />

      <div className="space-y-1">
        <Label className="label-muted">Nota del CEO (se muestra en el dashboard)</Label>
        <Textarea
          value={ceoNote}
          onChange={(e) => setCeoNote(e.target.value)}
          rows={3}
          placeholder="Recordatorio, foco del mes..."
          className="bg-muted/40 border-border/60 resize-none"
        />
      </div>

      <div className="space-y-1">
        <Label className="label-muted">Scope por defecto del dashboard</Label>
        <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
          <SelectTrigger className="bg-muted/40 border-border/60 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 días</SelectItem>
            <SelectItem value="30d">30 días</SelectItem>
            <SelectItem value="90d">90 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        size="sm"
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {saving ? "Guardando..." : "Guardar configuración"}
      </Button>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground/90">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none ${
          checked ? "bg-primary" : "bg-white/10"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
