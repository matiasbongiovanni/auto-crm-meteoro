import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SETTINGS, DEFAULT_WORKSPACE_ID, SHARED_STATE_KEYS } from "@/lib/constants";
import { getSupabaseServerClient } from "@/lib/server-supabase";
import { getPublicSupabaseEnv } from "@/lib/supabase-env";
import { generateApiKey } from "@/lib/api-auth";
import { deleteProposalRecord, listProposals, saveProposalRecord } from "@/lib/proposals-store";
import type { Agent, ApiKey, CalendarEvent, CompanyNote, OnboardingDoc, PendingPayment, PipelineCard, Profile, Proposal, Settings, Subscription } from "@/types/crm";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

async function readUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const env = getPublicSupabaseEnv();
  if (!env) return null;

  const response = await fetch(`${env.url}/auth/v1/user`, {
    headers: { apikey: env.anonKey, authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) return null;
  return response.json();
}

function roleRank(role?: string) {
  if (role === "ceo") return 3;
  if (role === "admin") return 2;
  if (role === "freelancer") return 1;
  return 0;
}

async function ensureProfile(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  const admin = getSupabaseServerClient();

  const { data: existing } = await admin
    .from("crm_profiles")
    .select("*")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing) return existing as Profile;

  const { count } = await admin
    .from("crm_profiles")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", DEFAULT_WORKSPACE_ID);

  const isCeo = !count || count === 0;

  const row = {
    id: user.id,
    workspace_id: DEFAULT_WORKSPACE_ID,
    user_id: user.id,
    email: user.email || "",
    full_name: String(user.user_metadata?.full_name || user.user_metadata?.name || ""),
    role: isCeo ? "ceo" : "freelancer",
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin.from("crm_profiles").upsert(row).select("*").single();
  if (error) throw error;
  return data as Profile;
}

async function loadWorkspaceState(admin: ReturnType<typeof getSupabaseServerClient>, workspaceId: string) {
  const { data, error } = await admin
    .from("crm_state")
    .select("state_key,payload")
    .eq("user_id", workspaceId);

  if (error) throw error;
  return new Map((data || []).map((row) => [row.state_key, row.payload]));
}

function normalizeSettings(value: unknown): Settings {
  const settings = typeof value === "object" && value ? (value as Partial<Settings>) : {};
  const monthlyGoalUsd = Number(settings.monthlyGoalUsd);
  return {
    defaultUsdType: settings.defaultUsdType || DEFAULT_SETTINGS.defaultUsdType,
    dashboardScope: settings.dashboardScope || DEFAULT_SETTINGS.dashboardScope,
    ceoNote: settings.ceoNote || DEFAULT_SETTINGS.ceoNote,
    monthlyGoalUsd: Number.isFinite(monthlyGoalUsd) && monthlyGoalUsd >= 0
      ? monthlyGoalUsd
      : DEFAULT_SETTINGS.monthlyGoalUsd,
  };
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

const VALID_SUB_STATUSES = new Set(["activa", "pausada", "cancelada"]);
const VALID_BILLING_CYCLES = new Set(["mensual", "trimestral", "semestral", "anual"]);

function normalizeSubscriptions(value: unknown): Subscription[] {
  return normalizeArray<Subscription>(value).map((sub) => ({
    ...sub,
    status: VALID_SUB_STATUSES.has(sub.status) ? sub.status : "activa",
    billing_cycle: VALID_BILLING_CYCLES.has(sub.billing_cycle) ? sub.billing_cycle : "mensual",
    amount_usd: typeof sub.amount_usd === "number" && !Number.isNaN(sub.amount_usd) ? sub.amount_usd : 0,
    renewal_date: sub.renewal_date || new Date().toISOString().slice(0, 10),
    name: sub.name || "",
    owner: sub.owner || "",
    category: sub.category || "",
    notes: sub.notes || "",
    start_date: sub.start_date || undefined,
    cancelled_at: sub.cancelled_at || undefined,
  }));
}

function normalizePipeline(value: unknown): PipelineCard[] {
  return normalizeArray<PipelineCard>(value).map((card) => ({
    ...card,
    company: card.company || "",
    owner: card.owner || "",
    stage: card.stage || "lead",
    value_usd:
      card.value_usd === null || card.value_usd === undefined || Number.isNaN(Number((card as { value_usd?: unknown }).value_usd))
        ? null
        : Number((card as { value_usd?: unknown }).value_usd),
    next_step: card.next_step || "",
    notes: card.notes || "",
    updated_at: card.updated_at || new Date().toISOString(),
    labels: Array.isArray(card.labels) ? card.labels.filter(Boolean).map(String) : [],
  }));
}

function normalizeAgents(value: unknown): Agent[] {
  return normalizeArray<Agent>(value).map((agent) => ({
    ...agent,
    pipeline_stage: agent.pipeline_stage || "lead",
    capabilities: Array.isArray(agent.capabilities) ? agent.capabilities.filter(Boolean).map(String) : [],
  }));
}

function normalizeSharedPayload(stateKey: string, payload: unknown): unknown {
  if (stateKey === "exp2_subscriptions") return normalizeSubscriptions(payload);
  if (stateKey === "exp2_pipeline") return normalizePipeline(payload);
  if (stateKey === "exp2_agents") return normalizeAgents(payload);
  if (stateKey === "exp2_settings") return normalizeSettings(payload);
  return payload;
}

export async function handleCrmRequest(request: NextRequest) {
  try {
    const user = await readUser(request);
    if (!user?.id) return json({ error: "Unauthorized" }, 401);

    const admin = getSupabaseServerClient();
    const currentProfile = await ensureProfile(user);
    const workspaceId = currentProfile.workspace_id || DEFAULT_WORKSPACE_ID;
    const currentRole = currentProfile.role;
    const sharedState = await loadWorkspaceState(admin, workspaceId);

    if (request.method === "GET") {
      const scope = new URL(request.url).searchParams.get("scope") || "all";

      if (scope === "finanzas") {
        const [ingresos, egresos] = await Promise.all([
          admin.from("crm_ingresos").select("*").eq("user_id", user.id).order("fecha", { ascending: false }),
          admin.from("crm_egresos").select("*").eq("user_id", user.id).order("fecha", { ascending: false }),
        ]);
        return json({ ok: true, ingresos: ingresos.data || [], egresos: egresos.data || [] });
      }

      if (scope === "shared") {
        return json({
          ok: true,
          subscriptions: normalizeSubscriptions(sharedState.get("exp2_subscriptions")),
          pipeline: normalizePipeline(sharedState.get("exp2_pipeline")),
          agents: normalizeAgents(sharedState.get("exp2_agents")),
          settings: normalizeSettings(sharedState.get("exp2_settings")),
          calendarEvents: normalizeArray<CalendarEvent>(sharedState.get("exp2_calendar")),
          companyNotes: normalizeArray<CompanyNote>(sharedState.get("exp2_company_notes")),
          pendingPayments: normalizeArray<PendingPayment>(sharedState.get("exp2_pending_payments")),
        });
      }

      if (scope === "proposals") {
        return json({ ok: true, proposals: await listProposals(admin, workspaceId, sharedState) });
      }

      const [leads, ingresos, egresos, profiles, apiKeys, onboardingDocs] = await Promise.all([
        admin.from("crm_leads").select("*").order("updated_at", { ascending: false }),
        admin.from("crm_ingresos").select("*").eq("user_id", user.id).order("fecha", { ascending: false }),
        admin.from("crm_egresos").select("*").eq("user_id", user.id).order("fecha", { ascending: false }),
        admin.from("crm_profiles").select("*").eq("workspace_id", DEFAULT_WORKSPACE_ID).order("updated_at", { ascending: false }),
        admin.from("crm_api_keys").select("id,name,key_prefix,scopes,last_used_at,created_at,revoked_at").eq("workspace_id", DEFAULT_WORKSPACE_ID).order("created_at", { ascending: false }),
        admin.from("crm_onboarding_docs").select("*").eq("workspace_id", DEFAULT_WORKSPACE_ID).order("created_at", { ascending: false }),
      ]);

      const state = await loadWorkspaceState(admin, workspaceId);
      const proposals = await listProposals(admin, workspaceId, state);

      return json({
        ok: true,
        profile: currentProfile,
        profiles: (profiles.data || []) as Profile[],
        leads: leads.data || [],
        ingresos: ingresos.data || [],
        egresos: egresos.data || [],
        subscriptions: normalizeSubscriptions(sharedState.get("exp2_subscriptions")),
        pipeline: normalizePipeline(sharedState.get("exp2_pipeline")),
        agents: normalizeAgents(sharedState.get("exp2_agents")),
        settings: normalizeSettings(sharedState.get("exp2_settings")),
        proposals,
        apiKeys: (apiKeys.data || []) as ApiKey[],
        calendarEvents: normalizeArray<CalendarEvent>(sharedState.get("exp2_calendar")),
        companyNotes: normalizeArray<CompanyNote>(sharedState.get("exp2_company_notes")),
        pendingPayments: normalizeArray<PendingPayment>(sharedState.get("exp2_pending_payments")),
        onboardingDocs: (onboardingDocs.data || []) as OnboardingDoc[],
        legacyState: Object.fromEntries(state.entries()),
      });
    }

    const body = await request.json().catch(() => null);
    if (!body?.action) return json({ error: "Missing action" }, 400);
    const payload = body.item || body.payload || body.data || {};

    if (body.action === "save-shared-state") {
      if (roleRank(currentRole) < 2) return json({ error: "Forbidden" }, 403);
      if (!SHARED_STATE_KEYS.has(body.stateKey)) return json({ error: "Invalid stateKey" }, 400);
      const normalized = normalizeSharedPayload(body.stateKey, body.payload);
      const { error } = await admin.from("crm_state").upsert({ user_id: workspaceId, state_key: body.stateKey, payload: normalized, updated_at: new Date().toISOString() });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "save-pipeline") {
      if (roleRank(currentRole) < 2) return json({ error: "Forbidden" }, 403);
      const { error } = await admin.from("crm_state").upsert({ user_id: workspaceId, state_key: "exp2_pipeline", payload: normalizePipeline(body.cards), updated_at: new Date().toISOString() });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "save-agent") {
      if (roleRank(currentRole) < 2) return json({ error: "Forbidden" }, 403);
      const currentAgents = normalizeAgents(sharedState.get("exp2_agents"));
      const nextAgent = normalizeAgents([payload])[0];
      const next = [nextAgent, ...currentAgents.filter((a) => a.id !== nextAgent.id)];
      const { error } = await admin.from("crm_state").upsert({ user_id: workspaceId, state_key: "exp2_agents", payload: next, updated_at: new Date().toISOString() });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, agent: nextAgent });
    }

    if (body.action === "save-profile") {
      if (currentRole !== "ceo") return json({ error: "Forbidden" }, 403);
      const { error, data } = await admin.from("crm_profiles").upsert({ id: payload.id, workspace_id: DEFAULT_WORKSPACE_ID, user_id: payload.user_id || payload.id, email: payload.email || "", full_name: payload.full_name || "", role: payload.role || "freelancer", status: payload.status || "active", updated_at: new Date().toISOString(), created_at: payload.created_at || new Date().toISOString() }).select("*").single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, profile: data });
    }

    if (body.action === "delete-profile") {
      if (currentRole !== "ceo") return json({ error: "Forbidden" }, 403);
      if (body.id === user.id) return json({ error: "Cannot delete current CEO profile" }, 400);
      const { error } = await admin.from("crm_profiles").delete().eq("workspace_id", DEFAULT_WORKSPACE_ID).eq("id", body.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "create-profile-user") {
      if (currentRole !== "ceo") return json({ error: "Forbidden" }, 403);
      if (!body.email || !body.password) return json({ error: "Email y contraseña son requeridos" }, 400);
      const { data: authData, error: authError } = await admin.auth.admin.createUser({ email: String(body.email), password: String(body.password), email_confirm: true });
      if (authError) return json({ error: authError.message }, 500);
      const profileRow = { id: authData.user.id, workspace_id: DEFAULT_WORKSPACE_ID, user_id: authData.user.id, email: authData.user.email || String(body.email), full_name: String(body.full_name || ""), role: (["ceo", "admin", "freelancer"].includes(String(body.role)) ? body.role : "freelancer") as string, status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      const { data: profileData, error: profileError } = await admin.from("crm_profiles").upsert(profileRow).select("*").single();
      if (profileError) return json({ error: profileError.message }, 500);
      return json({ ok: true, profile: profileData });
    }

    if (body.action === "save-lead") {
      const row = { id: payload.id, user_id: user.id, nombre: payload.nombre || "", origen: payload.origen || "", estado: payload.estado || "nuevo", accion: payload.accion || "", notas: payload.notas || "", fase: Number(payload.fase || 1), fecha: payload.fecha || new Date().toISOString().slice(0, 10), telefono: payload.telefono || null, empresa: payload.empresa || null, temperatura: payload.temperatura || "frio", updated_at: new Date().toISOString() };
      const { error } = await admin.from("crm_leads").upsert(row);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "delete-lead") {
      const { error } = await admin.from("crm_leads").delete().eq("id", body.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "save-ingreso") {
      const row = { id: payload.id, user_id: user.id, concepto: payload.concepto || "", persona: payload.persona || "", fecha: payload.fecha || new Date().toISOString().slice(0, 10), tipo: payload.tipo || "", flow_kind: payload.flow_kind || "mensualidad", payment_destination: payload.payment_destination || "", usd_type: payload.usd_type || "blue", period_month: payload.period_month || String(payload.fecha || "").slice(0, 7), exchange_snapshot: payload.exchange_snapshot || null, usd: payload.usd === null || payload.usd === "" ? null : Number(payload.usd), ars: payload.ars === null || payload.ars === "" ? null : Number(payload.ars), eur: payload.eur === null || payload.eur === "" ? null : Number(payload.eur), updated_at: new Date().toISOString() };
      const { error } = await admin.from("crm_ingresos").upsert(row);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "delete-ingreso") {
      const { error } = await admin.from("crm_ingresos").delete().eq("user_id", user.id).eq("id", body.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "save-egreso") {
      const row = { id: payload.id, user_id: user.id, concepto: payload.concepto || "", fecha: payload.fecha || new Date().toISOString().slice(0, 10), tipo: payload.tipo || "", cat: payload.cat || "", flow_kind: payload.flow_kind || "operacion", payment_destination: payload.payment_destination || "", usd_type: payload.usd_type || "blue", period_month: payload.period_month || String(payload.fecha || "").slice(0, 7), exchange_snapshot: payload.exchange_snapshot || null, usd: payload.usd === null || payload.usd === "" ? null : Number(payload.usd), ars: payload.ars === null || payload.ars === "" ? null : Number(payload.ars), eur: payload.eur === null || payload.eur === "" ? null : Number(payload.eur), updated_at: new Date().toISOString() };
      const { error } = await admin.from("crm_egresos").upsert(row);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "delete-egreso") {
      const { error } = await admin.from("crm_egresos").delete().eq("user_id", user.id).eq("id", body.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "save-proposal") {
      const proposalId = String(payload.id || crypto.randomUUID());
      const today = new Date();
      const defaultFollowUp = new Date(today);
      defaultFollowUp.setDate(defaultFollowUp.getDate() + 3);
      const defaultFollowUpDate = defaultFollowUp.toISOString().slice(0, 10);
      const existingProposals = await listProposals(admin, workspaceId, sharedState);
      const isNewProposal = !existingProposals.some((item) => item.id === proposalId);
      const nextFollowUp = payload.proximo_seguimiento || (isNewProposal ? defaultFollowUpDate : null);
      const saved = await saveProposalRecord(admin, { id: proposalId, cliente: payload.cliente || "", concepto: payload.concepto || "", monto_usd: payload.monto_usd === null || payload.monto_usd === "" ? null : Number(payload.monto_usd), fecha_envio: payload.fecha_envio || today.toISOString().slice(0, 10), proximo_seguimiento: nextFollowUp, estado: (["enviado", "en_negociacion", "aceptado", "rechazado", "vencido"].includes(payload.estado) ? payload.estado : "enviado") as Proposal["estado"], link_documento: payload.link_documento || null, notas: payload.notas || "", created_at: existingProposals.find((item) => item.id === proposalId)?.created_at }, workspaceId, user.id, sharedState);
      if (isNewProposal && nextFollowUp) {
        const currentEvents = normalizeArray<CalendarEvent>(sharedState.get("exp2_calendar"));
        const followUpEvent: CalendarEvent = { id: crypto.randomUUID(), title: `Seguimiento presupuesto - ${saved.cliente || "Cliente"}`, date: nextFollowUp, type: "seguimiento", completed: false, notes: `${saved.concepto || "Sin concepto"}${saved.monto_usd !== null ? ` - USD ${saved.monto_usd}` : ""}`, company: saved.cliente || "", created_at: today.toISOString() };
        const nextEvents = [followUpEvent, ...currentEvents.filter((e) => e.id !== followUpEvent.id)];
        const { error: calendarError } = await admin.from("crm_state").upsert({ user_id: workspaceId, state_key: "exp2_calendar", payload: nextEvents, updated_at: today.toISOString() });
        if (calendarError) return json({ error: calendarError.message }, 500);
      }
      return json({ ok: true });
    }

    if (body.action === "delete-proposal") {
      await deleteProposalRecord(admin, String(body.id || ""), workspaceId, sharedState);
      return json({ ok: true });
    }

    if (body.action === "save-onboarding-doc") {
      const docId = String(payload.id || crypto.randomUUID());
      const now = new Date().toISOString();
      const VALID_TIPOS = new Set(["bienvenida", "onboarding"]);
      const VALID_ESTADOS_DOC = new Set(["borrador", "enviado", "firmado"]);
      const row = { id: docId, workspace_id: DEFAULT_WORKSPACE_ID, user_id: user.id, cliente: payload.cliente || "", empresa: payload.empresa || null, tipo: VALID_TIPOS.has(payload.tipo) ? payload.tipo : "bienvenida", fecha: payload.fecha || now.slice(0, 10), estado: VALID_ESTADOS_DOC.has(payload.estado) ? payload.estado : "borrador", notas: payload.notas || "", updated_at: now, created_at: payload.created_at || now };
      const { error } = await admin.from("crm_onboarding_docs").upsert(row);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "delete-onboarding-doc") {
      const { error } = await admin.from("crm_onboarding_docs").delete().eq("workspace_id", DEFAULT_WORKSPACE_ID).eq("id", body.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "create-api-key") {
      if (currentRole !== "ceo") return json({ error: "Forbidden" }, 403);
      if (!body.name) return json({ error: "name is required" }, 400);
      const scopes = Array.isArray(body.scopes) ? body.scopes.filter((s: string) => ["read", "write", "admin"].includes(s)) : ["read"];
      const { full, prefix, hash } = generateApiKey();
      const row = { workspace_id: DEFAULT_WORKSPACE_ID, name: String(body.name), key_prefix: prefix, key_hash: hash, scopes, created_by: user.id, created_at: new Date().toISOString() };
      const { data, error } = await admin.from("crm_api_keys").insert(row).select("id,name,key_prefix,scopes,last_used_at,created_at,revoked_at").single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, key: full, apiKey: data as ApiKey });
    }

    if (body.action === "revoke-api-key") {
      if (currentRole !== "ceo") return json({ error: "Forbidden" }, 403);
      const { error } = await admin.from("crm_api_keys").update({ revoked_at: new Date().toISOString() }).eq("workspace_id", DEFAULT_WORKSPACE_ID).eq("id", body.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "save-calendar-event") {
      const current = normalizeArray<CalendarEvent>(sharedState.get("exp2_calendar"));
      const item = payload as CalendarEvent;
      const next = [item, ...current.filter((e) => e.id !== item.id)];
      const { error } = await admin.from("crm_state").upsert({ user_id: workspaceId, state_key: "exp2_calendar", payload: next, updated_at: new Date().toISOString() });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "delete-calendar-event") {
      const current = normalizeArray<CalendarEvent>(sharedState.get("exp2_calendar"));
      const next = current.filter((e) => e.id !== body.id);
      const { error } = await admin.from("crm_state").upsert({ user_id: workspaceId, state_key: "exp2_calendar", payload: next, updated_at: new Date().toISOString() });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "save-company-note") {
      const current = normalizeArray<CompanyNote>(sharedState.get("exp2_company_notes"));
      const item = payload as CompanyNote;
      const next = [item, ...current.filter((n) => n.id !== item.id)];
      const { error } = await admin.from("crm_state").upsert({ user_id: workspaceId, state_key: "exp2_company_notes", payload: next, updated_at: new Date().toISOString() });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "delete-company-note") {
      const current = normalizeArray<CompanyNote>(sharedState.get("exp2_company_notes"));
      const next = current.filter((n) => n.id !== body.id);
      const { error } = await admin.from("crm_state").upsert({ user_id: workspaceId, state_key: "exp2_company_notes", payload: next, updated_at: new Date().toISOString() });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "save-pending-payment") {
      const current = normalizeArray<PendingPayment>(sharedState.get("exp2_pending_payments"));
      const incoming = payload as PendingPayment;
      const previous = current.find((p) => p.id === incoming.id);
      const prevEstado = previous?.estado;
      const isCobradoTransition = prevEstado !== "cobrado" && incoming.estado === "cobrado";
      let item: PendingPayment = { ...incoming };
      if (previous?.ingreso_id && !item.ingreso_id) item.ingreso_id = previous.ingreso_id;
      if (previous?.cobrado_registered_at && !item.cobrado_registered_at) item.cobrado_registered_at = previous.cobrado_registered_at;
      if (isCobradoTransition && !item.ingreso_id) {
        const usd = item.monto_usd;
        if (usd === null || usd === undefined || Number.isNaN(Number(usd)) || Number(usd) <= 0) return json({ error: "No se puede marcar como cobrado sin monto USD válido." }, 400);
        const now = new Date();
        const nowIso = now.toISOString();
        const ingresoRow = { id: crypto.randomUUID(), user_id: user.id, concepto: `Cobro pendiente - ${item.cliente || "Cliente"} - ${item.concepto || "Sin concepto"}`, persona: item.cliente || "", fecha: nowIso.slice(0, 10), tipo: "ingreso", flow_kind: "cobro_pendiente", payment_destination: "", usd_type: "blue", period_month: nowIso.slice(0, 7), ars: null, usd: Number(usd), eur: null, exchange_snapshot: null };
        const { error: ingresoError } = await admin.from("crm_ingresos").upsert(ingresoRow);
        if (ingresoError) return json({ error: ingresoError.message }, 500);
        item = { ...item, ingreso_id: ingresoRow.id, cobrado_registered_at: nowIso };
      }
      const next = [item, ...current.filter((p) => p.id !== item.id)];
      const { error } = await admin.from("crm_state").upsert({ user_id: workspaceId, state_key: "exp2_pending_payments", payload: next, updated_at: new Date().toISOString() });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "delete-pending-payment") {
      const current = normalizeArray<PendingPayment>(sharedState.get("exp2_pending_payments"));
      const next = current.filter((p) => p.id !== body.id);
      const { error } = await admin.from("crm_state").upsert({ user_id: workspaceId, state_key: "exp2_pending_payments", payload: next, updated_at: new Date().toISOString() });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
}
