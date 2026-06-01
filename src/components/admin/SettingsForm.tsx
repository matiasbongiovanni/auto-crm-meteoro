"use client";

import { useState } from "react";
import { useCrm } from "@/components/crm/provider";
import { STATE_KEYS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function SettingsForm() {
  const { state, saveSharedState } = useCrm();
  const s = state.settings;

  const [goal, setGoal] = useState(String(s.monthlyGoalUsd || ""));
  const [hideGoal, setHideGoal] = useState(s.hideGoalAmount);
  const [hiddenByDefault, setHiddenByDefault] = useState(s.revenueHiddenByDefault);
  const [ceoNote, setCeoNote] = useState(s.ceoNote || "");
  const [scope, setScope] = useState<"7d" | "30d" | "90d">(s.dashboardScope || "30d");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const next = {
        ...s,
        monthlyGoalUsd: goal === "" ? 0 : Number(goal),
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
    <div className="space-y-5 max-w-sm">
      <div className="space-y-1">
        <Label className="label-muted">Meta mensual (USD)</Label>
        <Input
          type="number"
          min={0}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="0"
          className="bg-muted/40 border-border/60"
        />
        <p className="text-[11px] text-muted-foreground">0 = sin barra de meta en el dashboard</p>
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
