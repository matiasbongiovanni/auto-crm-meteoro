"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, Save } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type AgentStatus = {
  status: string;
  provider: string;
  model: string;
  max_tokens: number;
  uptime_seconds: number;
  environment: string;
};

type ProspeccionConfig = {
  schedule?: string;
  max_leads_per_run?: number;
  temperature_filter?: string;
  retry_attempts?: number;
  retry_interval_hours?: number;
  message_template?: string;
  business_hours?: { enabled: boolean; start: string; end: string; timezone: string };
  scores?: { sent_message?: number; positive_response?: number; negative_response?: number; no_response_after_all_retries?: number };
};

type PromptsConfig = {
  system_prompt?: string;
  fallback_message?: string;
  error_message?: string;
};

type NichoItem = { nombre: string; caso_de_exito: string; gancho: string };

type BusinessConfig = {
  negocio?: { nombre?: string; descripcion?: string; fundador?: string; ciudad?: string; mercado?: string; horario?: string; instagram?: string };
  agente?: { nombre?: string; tono?: string };
  nichos_objetivo?: NichoItem[];
};

const MODEL_PRICES: Record<string, { input: number; output: number; provider: "anthropic" | "groq" }> = {
  "claude-haiku-4-5": { input: 0.80, output: 4.00, provider: "anthropic" },
  "claude-sonnet-4-6": { input: 3.00, output: 15.00, provider: "anthropic" },
  "claude-opus-4-8": { input: 15.00, output: 75.00, provider: "anthropic" },
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79, provider: "groq" },
  "mixtral-8x7b-32768": { input: 0.27, output: 0.27, provider: "groq" },
  "llama-3.1-8b-instant": { input: 0.05, output: 0.08, provider: "groq" },
};

const ANTHROPIC_MODELS = Object.entries(MODEL_PRICES).filter(([, v]) => v.provider === "anthropic").map(([k]) => k);
const GROQ_MODELS = Object.entries(MODEL_PRICES).filter(([, v]) => v.provider === "groq").map(([k]) => k);

function useAuthToken() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const sb = getSupabaseBrowserClient();
    if (!sb) return;
    sb.auth.getSession().then(({ data }: { data: { session: { access_token: string } | null } }) => setToken(data.session?.access_token ?? null));
  }, []);
  return token;
}

async function fetchConfig(section: string, token: string) {
  const res = await fetch(`/api/agentkit/config?section=${section}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

async function saveConfig(section: string, payload: unknown, token: string) {
  const res = await fetch(`/api/agentkit/config?section=${section}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `Error ${res.status}`);
  }
  return res.json();
}

async function fetchStatus(token: string): Promise<AgentStatus> {
  const res = await fetch("/api/agentkit/status", {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

const inp = "w-full rounded-md bg-muted/40 border border-border/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40";
const sel = cn(inp, "cursor-pointer");

function SaveBar({ saving, error, success, onSave }: { saving: boolean; error: string | null; success: boolean; onSave: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/40 mt-6">
      {saving && <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Guardando...</span>}
      {!saving && error && <span className="text-xs text-destructive">{error}</span>}
      {!saving && !error && success && <span className="text-xs text-[var(--success)]">Guardado correctamente</span>}
      {!saving && !error && !success && <span />}
      <Button size="sm" onClick={onSave} disabled={saving} className="gap-1.5">
        <Save className="h-3.5 w-3.5" /> Guardar
      </Button>
    </div>
  );
}

function TabEstado({ token }: { token: string }) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setStatus(await fetchStatus(token)); }
    catch { setError("No se pudo conectar con el agentkit. Verificá que esté corriendo en el puerto configurado."); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const formatUptime = (secs: number) => {
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (loading) return <p className="text-sm text-muted-foreground py-6 text-center flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Conectando...</p>;
  if (error) return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 space-y-3">
      <p className="text-sm text-destructive">{error}</p>
      <Button variant="outline" size="sm" onClick={load}>Reintentar</Button>
    </div>
  );
  if (!status) return null;

  const price = MODEL_PRICES[status.model];
  const pill = (label: string, value: string, accent = false) => (
    <div className="metric-card rounded-xl p-4">
      <p className="label-muted mb-1">{label}</p>
      <p className={cn("text-base font-semibold", accent ? "text-[var(--success)]" : "text-foreground")}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {pill("Estado", status.status === "ok" ? "● Activo" : "● Inactivo", status.status === "ok")}
        {pill("Proveedor IA", status.provider)}
        {pill("Modelo", status.model)}
        {pill("Max tokens", status.max_tokens.toLocaleString())}
        {pill("Uptime", formatUptime(status.uptime_seconds))}
        {pill("Entorno", status.environment)}
      </div>
      {price && (
        <div className="metric-card rounded-xl p-4">
          <p className="label-muted mb-3">Costo del modelo activo</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><p className="label-muted mb-1">Input / MTok</p><p className="font-mono text-foreground">${price.input.toFixed(2)}</p></div>
            <div><p className="label-muted mb-1">Output / MTok</p><p className="font-mono text-foreground">${price.output.toFixed(2)}</p></div>
            <div><p className="label-muted mb-1">~2000 tokens</p><p className="font-mono text-primary">${((price.input + price.output) / 1000).toFixed(4)}</p></div>
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <button onClick={load} className="text-xs text-muted-foreground/60 hover:text-foreground transition flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Actualizar
        </button>
      </div>
    </div>
  );
}

function TabPrompt({ token }: { token: string }) {
  const [config, setConfig] = useState<PromptsConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchConfig("prompts", token).then(setConfig).catch(() => setError("Error cargando config")).finally(() => setLoading(false));
  }, [token]);

  const set = (k: keyof PromptsConfig, v: string) => { setConfig((c) => ({ ...c, [k]: v })); setSuccess(false); };
  const save = async () => {
    setSaving(true); setError(null); setSuccess(false);
    try { await saveConfig("prompts", config, token); setSuccess(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-sm text-muted-foreground py-6 text-center"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Cargando...</p>;

  return (
    <div className="space-y-5">
      <div>
        <Label className="label-muted block mb-1">System Prompt</Label>
        <p className="text-xs text-muted-foreground/60 mb-2">Instrucciones principales del agente. Los cambios aplican en el próximo mensaje — no requiere reiniciar.</p>
        <div className="relative">
          <Textarea className="bg-muted/40 border-border/60 font-mono text-xs leading-6 resize-y min-h-48" rows={18}
            value={config.system_prompt ?? ""} onChange={(e) => set("system_prompt", e.target.value)}
            placeholder="Sos Lucas, el agente prospector de Meteoro..." />
          <span className="absolute bottom-3 right-4 text-[10px] text-muted-foreground/40">{(config.system_prompt ?? "").length} chars</span>
        </div>
      </div>
      <div>
        <Label className="label-muted block mb-1">Mensaje de fallback</Label>
        <p className="text-xs text-muted-foreground/60 mb-2">Se envía cuando el mensaje es demasiado corto o incomprensible.</p>
        <Textarea className="bg-muted/40 border-border/60 text-sm resize-y" rows={3} value={config.fallback_message ?? ""} onChange={(e) => set("fallback_message", e.target.value)} />
      </div>
      <div>
        <Label className="label-muted block mb-1">Mensaje de error</Label>
        <p className="text-xs text-muted-foreground/60 mb-2">Se envía cuando la API de IA falla o hay un problema técnico.</p>
        <Textarea className="bg-muted/40 border-border/60 text-sm resize-y" rows={3} value={config.error_message ?? ""} onChange={(e) => set("error_message", e.target.value)} />
      </div>
      <SaveBar saving={saving} error={error} success={success} onSave={save} />
    </div>
  );
}

function TabProspeccion({ token }: { token: string }) {
  const [config, setConfig] = useState<ProspeccionConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchConfig("prospection", token).then(setConfig).catch(() => setError("Error cargando config")).finally(() => setLoading(false));
  }, [token]);

  const set = <K extends keyof ProspeccionConfig>(k: K, v: ProspeccionConfig[K]) => { setConfig((c) => ({ ...c, [k]: v })); setSuccess(false); };
  const setHours = (k: keyof NonNullable<ProspeccionConfig["business_hours"]>, v: string | boolean) => {
    setConfig((c) => ({ ...c, business_hours: { enabled: false, start: "09:00", end: "18:00", timezone: "America/Argentina/Buenos_Aires", ...c.business_hours, [k]: v } }));
    setSuccess(false);
  };
  const setScore = (k: string, v: number) => { setConfig((c) => ({ ...c, scores: { ...c.scores, [k]: v } })); setSuccess(false); };
  const save = async () => {
    setSaving(true); setError(null); setSuccess(false);
    try { await saveConfig("prospection", config, token); setSuccess(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-sm text-muted-foreground py-6 text-center"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Cargando...</p>;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="label-muted block mb-1">Schedule (cron)</Label>
          <p className="text-[10px] text-muted-foreground/50 mb-1.5">Ej: <code className="text-muted-foreground">0 */6 * * *</code> = cada 6hs</p>
          <input className={inp} value={config.schedule ?? ""} onChange={(e) => set("schedule", e.target.value)} placeholder="0 */6 * * *" />
        </div>
        <div>
          <Label className="label-muted block mb-1">Filtro de temperatura</Label>
          <select className={sel} value={config.temperature_filter ?? "cold"} onChange={(e) => set("temperature_filter", e.target.value)}>
            <option value="cold">cold — solo leads fríos</option>
            <option value="warm">warm — leads tibios</option>
            <option value="all">all — todos</option>
          </select>
        </div>
        <div>
          <Label className="label-muted block mb-1">Máx. leads por ejecución</Label>
          <input type="number" className={inp} value={config.max_leads_per_run ?? 10} onChange={(e) => set("max_leads_per_run", parseInt(e.target.value))} min={1} max={100} />
        </div>
        <div>
          <Label className="label-muted block mb-1">Intentos de reintento</Label>
          <input type="number" className={inp} value={config.retry_attempts ?? 3} onChange={(e) => set("retry_attempts", parseInt(e.target.value))} min={1} max={10} />
        </div>
        <div className="md:col-span-2">
          <Label className="label-muted block mb-1">Intervalo entre reintentos (horas)</Label>
          <input type="number" className={inp} value={config.retry_interval_hours ?? 48} onChange={(e) => set("retry_interval_hours", parseInt(e.target.value))} min={1} />
        </div>
      </div>

      <div>
        <Label className="label-muted block mb-1">Template de mensaje inicial</Label>
        <p className="text-[10px] text-muted-foreground/50 mb-1.5">Variables: <code className="text-muted-foreground">{"{name}"}</code> <code className="text-muted-foreground">{"{business_name}"}</code></p>
        <textarea className={cn(inp, "font-mono text-xs resize-y")} rows={5}
          value={config.message_template ?? ""} onChange={(e) => set("message_template", e.target.value)} />
      </div>

      <div className="metric-card rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="label-muted">Horario de atención</Label>
          <button type="button" onClick={() => setHours("enabled", !config.business_hours?.enabled)}
            className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", config.business_hours?.enabled ? "bg-primary" : "bg-muted")}>
            <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-primary-foreground shadow transition-transform", config.business_hours?.enabled ? "translate-x-4" : "translate-x-0.5")} />
          </button>
        </div>
        {config.business_hours?.enabled && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <p className="label-muted mb-1">Inicio</p>
              <input type="time" className={inp} value={config.business_hours.start ?? "09:00"} onChange={(e) => setHours("start", e.target.value)} />
            </div>
            <div>
              <p className="label-muted mb-1">Fin</p>
              <input type="time" className={inp} value={config.business_hours.end ?? "18:00"} onChange={(e) => setHours("end", e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <div>
        <Label className="label-muted block mb-3">Scores de estado</Label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { k: "sent_message", label: "Mensaje enviado" },
            { k: "positive_response", label: "Respuesta positiva" },
            { k: "negative_response", label: "Rechazo" },
            { k: "no_response_after_all_retries", label: "Sin respuesta (agotado)" },
          ].map(({ k, label }) => (
            <div key={k}>
              <p className="label-muted mb-1">{label}</p>
              <input type="number" className={inp}
                value={(config.scores as Record<string, number> | undefined)?.[k] ?? 0}
                onChange={(e) => setScore(k, parseInt(e.target.value))} min={0} />
            </div>
          ))}
        </div>
      </div>
      <SaveBar saving={saving} error={error} success={success} onSave={save} />
    </div>
  );
}

function TabNegocio({ token }: { token: string }) {
  const [config, setConfig] = useState<BusinessConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchConfig("business", token).then(setConfig).catch(() => setError("Error cargando config")).finally(() => setLoading(false));
  }, [token]);

  const setNeg = (k: string, v: string) => { setConfig((c) => ({ ...c, negocio: { ...c.negocio, [k]: v } })); setSuccess(false); };
  const setAgt = (k: string, v: string) => { setConfig((c) => ({ ...c, agente: { ...c.agente, [k]: v } })); setSuccess(false); };
  const setNicho = (i: number, k: keyof NichoItem, v: string) => {
    setConfig((c) => { const nichos = [...(c.nichos_objetivo ?? [])]; nichos[i] = { ...nichos[i], [k]: v }; return { ...c, nichos_objetivo: nichos }; });
    setSuccess(false);
  };
  const addNicho = () => { setConfig((c) => ({ ...c, nichos_objetivo: [...(c.nichos_objetivo ?? []), { nombre: "", caso_de_exito: "", gancho: "" }] })); setSuccess(false); };
  const removeNicho = (i: number) => { setConfig((c) => ({ ...c, nichos_objetivo: (c.nichos_objetivo ?? []).filter((_, idx) => idx !== i) })); setSuccess(false); };
  const save = async () => {
    setSaving(true); setError(null); setSuccess(false);
    try { await saveConfig("business", config, token); setSuccess(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-sm text-muted-foreground py-6 text-center"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Cargando...</p>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Datos del negocio</p>
        <div className="grid md:grid-cols-2 gap-3">
          {(["nombre", "fundador", "ciudad", "mercado", "horario", "instagram"] as const).map((k) => (
            <div key={k}>
              <Label className="label-muted block mb-1 capitalize">{k}</Label>
              <input className={inp} value={config.negocio?.[k] ?? ""} onChange={(e) => setNeg(k, e.target.value)} />
            </div>
          ))}
          <div className="md:col-span-2">
            <Label className="label-muted block mb-1">Descripción</Label>
            <textarea className={cn(inp, "resize-y text-sm")} rows={4} value={config.negocio?.descripcion ?? ""} onChange={(e) => setNeg("descripcion", e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Configuración del agente</p>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label className="label-muted block mb-1">Nombre del agente</Label>
            <input className={inp} value={config.agente?.nombre ?? ""} onChange={(e) => setAgt("nombre", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label className="label-muted block mb-1">Tono del agente</Label>
            <textarea className={cn(inp, "resize-y text-sm")} rows={3} value={config.agente?.tono ?? ""} onChange={(e) => setAgt("tono", e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nichos objetivo</p>
          <button onClick={addNicho} className="text-xs text-primary hover:opacity-80 transition">+ Agregar nicho</button>
        </div>
        <div className="space-y-4">
          {(config.nichos_objetivo ?? []).map((nicho, i) => (
            <div key={i} className="metric-card rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="label-muted">Nicho {i + 1}</p>
                <button onClick={() => removeNicho(i)} className="text-xs text-destructive/60 hover:text-destructive transition">Eliminar</button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label className="label-muted block mb-1">Nombre</Label>
                  <input className={inp} value={nicho.nombre} onChange={(e) => setNicho(i, "nombre", e.target.value)} placeholder="Clínicas estéticas" />
                </div>
                <div>
                  <Label className="label-muted block mb-1">Caso de éxito</Label>
                  <input className={inp} value={nicho.caso_de_exito} onChange={(e) => setNicho(i, "caso_de_exito", e.target.value)} placeholder="CARA Medicina" />
                </div>
                <div className="md:col-span-2">
                  <Label className="label-muted block mb-1">Gancho (resultado clave)</Label>
                  <input className={inp} value={nicho.gancho} onChange={(e) => setNicho(i, "gancho", e.target.value)} placeholder="80% menos cancelaciones..." />
                </div>
              </div>
            </div>
          ))}
          {(config.nichos_objetivo ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Sin nichos configurados.</p>
          )}
        </div>
      </div>
      <SaveBar saving={saving} error={error} success={success} onSave={save} />
    </div>
  );
}

function TabModeloIA({ token }: { token: string }) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [provider, setProvider] = useState<"anthropic" | "groq">("anthropic");
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [maxTokens, setMaxTokens] = useState(1024);
  const [convTokensIn, setConvTokensIn] = useState(1500);
  const [convTokensOut, setConvTokensOut] = useState(500);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus(token)
      .then((s) => { setStatus(s); const p = s.provider as "anthropic" | "groq"; setProvider(p); setModel(s.model); setMaxTokens(s.max_tokens); })
      .catch(() => setError("No se pudo conectar con el agentkit"))
      .finally(() => setLoading(false));
  }, [token]);

  const availableModels = provider === "anthropic" ? ANTHROPIC_MODELS : GROQ_MODELS;
  const handleProviderChange = (p: "anthropic" | "groq") => { setProvider(p); setModel(p === "anthropic" ? "claude-sonnet-4-6" : "llama-3.3-70b-versatile"); setSuccess(false); };
  const save = async () => {
    setSaving(true); setError(null); setSuccess(false);
    try { await saveConfig("env", { AGENTKIT_MODEL: model, AGENTKIT_MAX_TOKENS: String(maxTokens) }, token); setSuccess(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  };

  const price = MODEL_PRICES[model];
  const estimatedCost = price ? (convTokensIn / 1_000_000 * price.input) + (convTokensOut / 1_000_000 * price.output) : null;

  if (loading) return <p className="text-sm text-muted-foreground py-6 text-center"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Cargando...</p>;

  return (
    <div className="space-y-6">
      {status && (
        <div className="metric-card rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-[var(--success)] text-xs">●</span>
          <p className="text-xs text-muted-foreground">
            Activo: <span className="text-foreground">{status.provider} / {status.model}</span> — max_tokens: <span className="text-foreground">{status.max_tokens}</span>
          </p>
        </div>
      )}
      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
        <p className="text-xs text-amber-300">
          Cambiar modelo requiere reiniciar el agentkit: <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono">uvicorn agent.main:app --reload</code>
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="label-muted block mb-1">Proveedor IA</Label>
          <select className={sel} value={provider} onChange={(e) => handleProviderChange(e.target.value as "anthropic" | "groq")}>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="groq">Groq (open-source)</option>
          </select>
        </div>
        <div>
          <Label className="label-muted block mb-1">Modelo</Label>
          <select className={sel} value={model} onChange={(e) => { setModel(e.target.value); setSuccess(false); }}>
            {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <Label className="label-muted block mb-1">Max tokens por respuesta</Label>
          <input type="number" className={inp} value={maxTokens} onChange={(e) => { setMaxTokens(parseInt(e.target.value)); setSuccess(false); }} min={256} max={8192} step={256} />
        </div>
      </div>

      <div className="overflow-x-auto metric-card rounded-xl">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40">
              <th className="text-left px-4 py-3 label-muted font-medium">Modelo</th>
              <th className="text-right px-4 py-3 label-muted font-medium">Input</th>
              <th className="text-right px-4 py-3 label-muted font-medium">Output</th>
              <th className="text-right px-4 py-3 label-muted font-medium">Proveedor</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(MODEL_PRICES).map(([m, p]) => (
              <tr key={m} className={cn("border-b border-border/20 last:border-0 transition-colors", m === model ? "bg-primary/5" : "hover:bg-muted/30")}>
                <td className="px-4 py-3 font-mono text-foreground/80">{m} {m === model && <span className="text-primary ml-2">← activo</span>}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">${p.input.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">${p.output.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground/60">{p.provider}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="metric-card rounded-xl p-4 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Calculadora de costo por conversación</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="label-muted block mb-1">Tokens entrada (promedio)</Label>
            <input type="number" className={inp} value={convTokensIn} onChange={(e) => setConvTokensIn(parseInt(e.target.value))} min={100} step={100} />
          </div>
          <div>
            <Label className="label-muted block mb-1">Tokens salida (promedio)</Label>
            <input type="number" className={inp} value={convTokensOut} onChange={(e) => setConvTokensOut(parseInt(e.target.value))} min={50} step={50} />
          </div>
        </div>
        {estimatedCost !== null && price && (
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/40">
            <div><p className="label-muted mb-1">Entrada</p><p className="text-foreground font-mono text-sm">${(convTokensIn / 1_000_000 * price.input).toFixed(5)}</p></div>
            <div><p className="label-muted mb-1">Salida</p><p className="text-foreground font-mono text-sm">${(convTokensOut / 1_000_000 * price.output).toFixed(5)}</p></div>
            <div><p className="label-muted mb-1">Total / conversación</p><p className="text-primary font-mono text-sm font-semibold">${estimatedCost.toFixed(5)}</p></div>
          </div>
        )}
        {estimatedCost !== null && (
          <p className="text-[10px] text-muted-foreground/50">
            1.000 conv ≈ <span className="text-muted-foreground">${(estimatedCost * 1000).toFixed(3)}</span> | 10.000 ≈ <span className="text-muted-foreground">${(estimatedCost * 10000).toFixed(2)}</span>
          </p>
        )}
      </div>
      <SaveBar saving={saving} error={error} success={success} onSave={save} />
    </div>
  );
}

type Tab = "estado" | "prompt" | "prospeccion" | "negocio" | "modelo";

const TABS: { id: Tab; label: string }[] = [
  { id: "estado", label: "Estado" },
  { id: "prompt", label: "Prompt" },
  { id: "prospeccion", label: "Prospección" },
  { id: "negocio", label: "Negocio" },
  { id: "modelo", label: "Modelo IA" },
];

export function ProspectorPanel() {
  const token = useAuthToken();
  const [activeTab, setActiveTab] = useState<Tab>("estado");

  if (!token) {
    return (
      <div className="metric-card rounded-xl p-6 text-center">
        <p className="text-sm text-muted-foreground">Autenticando...</p>
      </div>
    );
  }

  return (
    <div className="metric-card rounded-xl overflow-hidden">
      <div className="flex items-center gap-1 border-b border-border/40 px-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
              activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-5">
        {activeTab === "estado" && <TabEstado token={token} />}
        {activeTab === "prompt" && <TabPrompt token={token} />}
        {activeTab === "prospeccion" && <TabProspeccion token={token} />}
        {activeTab === "negocio" && <TabNegocio token={token} />}
        {activeTab === "modelo" && <TabModeloIA token={token} />}
      </div>
    </div>
  );
}
