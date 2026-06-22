import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SETTINGS, DEFAULT_WORKSPACE_ID, SHARED_STATE_KEYS } from "@/lib/constants";
import { getSupabaseServerClient } from "@/lib/server-supabase";
import { getPublicSupabaseEnv } from "@/lib/supabase-env";
import { generateApiKey } from "@/lib/api-auth";
import { deleteProposalRecord, listProposals, saveProposalRecord } from "@/lib/proposals-store";
import type { Agent, ApiKey, CalendarEvent, Cliente, CompanyNote, Invoice, Meta, MetaTipo, MetaUnidad, OnboardingDoc, PendingPayment, PipelineCard, Profile, Proposal, Settings, Subscription } from "@/types/crm";
import { DEFAULT_METAS } from "@/lib/metas";

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

const VALID_META_TIPOS = new Set<MetaTipo>(["cash_collect", "ventas_servicio", "ventas_producto", "custom"]);
const VALID_META_UNIDADES = new Set<MetaUnidad>(["usd", "cantidad"]);

function normalizeMetas(value: unknown, monthlyGoalUsd: number): Meta[] {
  if (!Array.isArray(value) || value.length === 0) {
    // Seed: migrar la meta única legacy a cash collect si existe, + las metas sugeridas.
    if (monthlyGoalUsd > 0) {
      return DEFAULT_METAS.map((m) =>
        m.tipo === "cash_collect" ? { ...m, target: monthlyGoalUsd } : m,
      );
    }
    return DEFAULT_METAS;
  }

  const metas: Meta[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || !raw) continue;
    const m = raw as Partial<Meta>;
    const tipo: MetaTipo = VALID_META_TIPOS.has(m.tipo as MetaTipo) ? (m.tipo as MetaTipo) : "custom";
    const unidad: MetaUnidad = VALID_META_UNIDADES.has(m.unidad as MetaUnidad) ? (m.unidad as MetaUnidad) : "cantidad";
    const target = Number(m.target);
    const manual = Number(m.manual);
    metas.push({
      id: typeof m.id === "string" && m.id ? m.id : crypto.randomUUID(),
      label: typeof m.label === "string" ? m.label : "Meta",
      tipo,
      unidad,
      target: Number.isFinite(target) && target >= 0 ? target : 0,
      ...(typeof m.productoMatch === "string" ? { productoMatch: m.productoMatch } : {}),
      ...(Number.isFinite(manual) && manual >= 0 ? { manual } : {}),
      ...(typeof m.subtitulo === "string" ? { subtitulo: m.subtitulo } : {}),
    });
  }
  return metas;
}

function normalizeSettings(value: unknown): Settings {
  const settings = typeof value === "object" && value ? (value as Partial<Settings>) : {};
  const monthlyGoalUsd = Number(settings.monthlyGoalUsd);
  const goal = Number.isFinite(monthlyGoalUsd) && monthlyGoalUsd >= 0
    ? monthlyGoalUsd
    : DEFAULT_SETTINGS.monthlyGoalUsd;
  return {
    defaultUsdType: settings.defaultUsdType || DEFAULT_SETTINGS.defaultUsdType,
    dashboardScope: settings.dashboardScope || DEFAULT_SETTINGS.dashboardScope,
    ceoNote: settings.ceoNote || DEFAULT_SETTINGS.ceoNote,
    monthlyGoalUsd: goal,
    hideGoalAmount: settings.hideGoalAmount === true,
    revenueHiddenByDefault: settings.revenueHiddenByDefault === true,
    metas: normalizeMetas(settings.metas, goal),
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

      if (scope === "clientes") {
        const [clientesRes, invoicesRes] = await Promise.all([
          admin.from("crm_clientes").select("*").eq("workspace_id", DEFAULT_WORKSPACE_ID).order("nombre"),
          admin.from("crm_invoices").select("*").eq("workspace_id", DEFAULT_WORKSPACE_ID).order("fecha_emision", { ascending: false }),
        ]).catch(() => [{ data: [] }, { data: [] }]);
        return json({ ok: true, clientes: clientesRes.data || [], invoices: invoicesRes.data || [] });
      }

      const [leads, ingresos, egresos, profiles, apiKeys, onboardingDocs] = await Promise.all([
        admin.from("crm_leads").select("*").order("updated_at", { ascending: false }),
        admin.from("crm_ingresos").select("*").eq("user_id", user.id).order("fecha", { ascending: false }),
        admin.from("crm_egresos").select("*").eq("user_id", user.id).order("fecha", { ascending: false }),
        admin.from("crm_profiles").select("*").eq("workspace_id", DEFAULT_WORKSPACE_ID).order("updated_at", { ascending: false }),
        admin.from("crm_api_keys").select("id,name,key_prefix,scopes,last_used_at,created_at,revoked_at").eq("workspace_id", DEFAULT_WORKSPACE_ID).order("created_at", { ascending: false }),
        admin.from("crm_onboarding_docs").select("*").eq("workspace_id", DEFAULT_WORKSPACE_ID).order("created_at", { ascending: false }),
      ]);

      const [clientesRes, invoicesRes] = await Promise.all([
        admin.from("crm_clientes").select("*").eq("workspace_id", DEFAULT_WORKSPACE_ID).order("nombre"),
        admin.from("crm_invoices").select("*").eq("workspace_id", DEFAULT_WORKSPACE_ID).order("fecha_emision", { ascending: false }),
      ]).catch(() => [{ data: [] }, { data: [] }]);

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
        clientes: (clientesRes.data || []) as Cliente[],
        invoices: (invoicesRes.data || []) as Invoice[],
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
      const row = { id: payload.id, user_id: user.id, workspace_id: workspaceId, nombre: payload.nombre || "", origen: payload.origen || "", estado: payload.estado || "nuevo", accion: payload.accion || "", notas: payload.notas || "", fase: Number(payload.fase || 1), fecha: payload.fecha || new Date().toISOString().slice(0, 10), telefono: payload.telefono || null, email: payload.email || null, empresa: payload.empresa || null, temperatura: payload.temperatura || "frio", canal_contacto: payload.canal_contacto || null, nicho: payload.nicho || null, ciudad: payload.ciudad || null, pais: payload.pais || null, ig_handle: payload.ig_handle || null, updated_at: new Date().toISOString() };
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
      if (roleRank(currentRole) < 2) return json({ error: "Forbidden" }, 403);
      const row = { id: payload.id, user_id: user.id, concepto: payload.concepto || "", persona: payload.persona || "", fecha: payload.fecha || new Date().toISOString().slice(0, 10), tipo: payload.tipo || "", flow_kind: payload.flow_kind || "mensualidad", payment_destination: payload.payment_destination || "", usd_type: payload.usd_type || "blue", period_month: payload.period_month || String(payload.fecha || "").slice(0, 7), exchange_snapshot: payload.exchange_snapshot || null, usd: payload.usd === null || payload.usd === "" ? null : Number(payload.usd), ars: payload.ars === null || payload.ars === "" ? null : Number(payload.ars), eur: payload.eur === null || payload.eur === "" ? null : Number(payload.eur), updated_at: new Date().toISOString() };
      const { error } = await admin.from("crm_ingresos").upsert(row);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "delete-ingreso") {
      if (roleRank(currentRole) < 2) return json({ error: "Forbidden" }, 403);
      const { error } = await admin.from("crm_ingresos").delete().eq("user_id", user.id).eq("id", body.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "save-egreso") {
      if (roleRank(currentRole) < 2) return json({ error: "Forbidden" }, 403);
      const row = { id: payload.id, user_id: user.id, concepto: payload.concepto || "", fecha: payload.fecha || new Date().toISOString().slice(0, 10), tipo: payload.tipo || "", cat: payload.cat || "", flow_kind: payload.flow_kind || "operacion", payment_destination: payload.payment_destination || "", usd_type: payload.usd_type || "blue", period_month: payload.period_month || String(payload.fecha || "").slice(0, 7), exchange_snapshot: payload.exchange_snapshot || null, usd: payload.usd === null || payload.usd === "" ? null : Number(payload.usd), ars: payload.ars === null || payload.ars === "" ? null : Number(payload.ars), eur: payload.eur === null || payload.eur === "" ? null : Number(payload.eur), updated_at: new Date().toISOString() };
      const { error } = await admin.from("crm_egresos").upsert(row);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "delete-egreso") {
      if (roleRank(currentRole) < 2) return json({ error: "Forbidden" }, 403);
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
      const saved = await saveProposalRecord(admin, { id: proposalId, cliente: payload.cliente || "", concepto: payload.concepto || "", monto_usd: payload.monto_usd === null || payload.monto_usd === "" ? null : Number(payload.monto_usd), fecha_envio: payload.fecha_envio || today.toISOString().slice(0, 10), proximo_seguimiento: nextFollowUp, estado: (["enviado", "en_negociacion", "aceptado", "rechazado", "vencido"].includes(payload.estado) ? payload.estado : "enviado") as Proposal["estado"], link_documento: payload.link_documento || null, notas: payload.notas || "", datos: payload.datos ?? null, created_at: existingProposals.find((item) => item.id === proposalId)?.created_at }, workspaceId, user.id, sharedState);
      if (isNewProposal && nextFollowUp) {
        const currentEvents = normalizeArray<CalendarEvent>(sharedState.get("exp2_calendar"));
        const followUpEvent: CalendarEvent = { id: crypto.randomUUID(), title: `Seguimiento presupuesto - ${saved.cliente || "Cliente"}`, date: nextFollowUp, type: "seguimiento", completed: false, notes: `${saved.concepto || "Sin concepto"}${saved.monto_usd !== null ? ` - USD ${saved.monto_usd}` : ""}`, company: saved.cliente || "", created_at: today.toISOString() };
        const nextEvents = [followUpEvent, ...currentEvents.filter((e) => e.id !== followUpEvent.id)];
        const { error: calendarError } = await admin.from("crm_state").upsert({ user_id: workspaceId, state_key: "exp2_calendar", payload: nextEvents, updated_at: today.toISOString() });
        if (calendarError) return json({ error: calendarError.message }, 500);
      }
      // Transición a "aceptado" → crear ingreso por cobrar automáticamente
      const previousEstado = existingProposals.find((item) => item.id === proposalId)?.estado;
      const isAceptadoTransition = saved.estado === "aceptado" && previousEstado !== "aceptado";
      if (isAceptadoTransition && saved.monto_usd != null && saved.monto_usd > 0) {
        const nowIso = today.toISOString();
        const ingresoRow = {
          id: crypto.randomUUID(),
          user_id: user.id,
          concepto: `Por cobrar — ${saved.cliente || "Cliente"}: ${saved.concepto || "Sin concepto"}`,
          persona: saved.cliente || "",
          fecha: nowIso.slice(0, 10),
          tipo: "ingreso",
          flow_kind: "cobro_pendiente",
          payment_destination: "",
          usd_type: "blue",
          period_month: nowIso.slice(0, 7),
          ars: null,
          usd: Number(saved.monto_usd),
          eur: null,
          exchange_snapshot: null,
        };
        const { error: ingresoError } = await admin.from("crm_ingresos").insert(ingresoRow);
        if (ingresoError) return json({ error: ingresoError.message }, 500);
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
      const row = { id: docId, workspace_id: DEFAULT_WORKSPACE_ID, user_id: user.id, cliente: payload.cliente || "", empresa: payload.empresa || null, tipo: VALID_TIPOS.has(payload.tipo) ? payload.tipo : "bienvenida", fecha: payload.fecha || now.slice(0, 10), estado: VALID_ESTADOS_DOC.has(payload.estado) ? payload.estado : "borrador", notas: payload.notas || "", datos: payload.datos ?? null, updated_at: now, created_at: payload.created_at || now };
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

    if (body.action === "save-cliente") {
      if (roleRank(currentRole) < 2) return json({ error: "Forbidden" }, 403);
      const clienteId = String(payload.id || crypto.randomUUID());
      const now = new Date().toISOString();
      const row = {
        id: clienteId,
        workspace_id: DEFAULT_WORKSPACE_ID,
        user_id: user.id,
        nombre: payload.nombre || "",
        empresa: payload.empresa || null,
        contacto: payload.contacto || null,
        telefono: payload.telefono || null,
        email: payload.email || null,
        status: (["activo", "pausado", "churned"].includes(payload.status) ? payload.status : "activo") as string,
        producto: payload.producto || "",
        fee_usd: Number(payload.fee_usd) || 0,
        billing_cycle: (["mensual", "trimestral", "anual", "unico"].includes(payload.billing_cycle) ? payload.billing_cycle : "mensual") as string,
        fecha_alta: payload.fecha_alta || now.slice(0, 10),
        fecha_renovacion: payload.fecha_renovacion || null,
        owner: payload.owner || null,
        contexto_path: payload.contexto_path || null,
        notas: payload.notas || null,
        updated_at: now,
        created_at: payload.created_at || now,
      };
      const { error } = await admin.from("crm_clientes").upsert(row);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "delete-cliente") {
      if (roleRank(currentRole) < 2) return json({ error: "Forbidden" }, 403);
      const { error } = await admin.from("crm_clientes").delete().eq("workspace_id", DEFAULT_WORKSPACE_ID).eq("id", body.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "save-invoice") {
      if (roleRank(currentRole) < 2) return json({ error: "Forbidden" }, 403);
      const invoiceId = String(payload.id || crypto.randomUUID());
      const now = new Date().toISOString();
      const row = {
        id: invoiceId,
        workspace_id: DEFAULT_WORKSPACE_ID,
        cliente_id: payload.cliente_id,
        concepto: payload.concepto || "",
        period_month: payload.period_month || now.slice(0, 7),
        monto_usd: Number(payload.monto_usd) || 0,
        status: (["pendiente", "pagada", "vencida", "anulada"].includes(payload.status) ? payload.status : "pendiente") as string,
        fecha_emision: payload.fecha_emision || now.slice(0, 10),
        fecha_vencimiento: payload.fecha_vencimiento || now.slice(0, 10),
        fecha_pago: payload.fecha_pago || null,
        ingreso_id: payload.ingreso_id || null,
        notas: payload.notas || null,
        updated_at: now,
        created_at: payload.created_at || now,
      };
      const { error } = await admin.from("crm_invoices").upsert(row);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "delete-invoice") {
      if (roleRank(currentRole) < 2) return json({ error: "Forbidden" }, 403);
      const { error } = await admin.from("crm_invoices").delete().eq("workspace_id", DEFAULT_WORKSPACE_ID).eq("id", body.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "mark-invoice-paid") {
      if (roleRank(currentRole) < 2) return json({ error: "Forbidden" }, 403);
      const invoiceId = String(body.id || "");
      const { data: invoiceData } = await admin.from("crm_invoices").select("*").eq("id", invoiceId).single();
      if (!invoiceData) return json({ error: "Factura no encontrada" }, 404);
      const invoice = invoiceData as Invoice & { cliente_id: string };
      const { data: clienteData } = await admin.from("crm_clientes").select("nombre,empresa").eq("id", invoice.cliente_id).single();
      const clienteNombre = (clienteData as { nombre?: string; empresa?: string } | null)?.nombre || "Cliente";
      const now = new Date();
      const nowIso = now.toISOString();
      const ingresoRow = {
        id: crypto.randomUUID(),
        user_id: user.id,
        concepto: `Factura - ${clienteNombre} - ${invoice.concepto || invoice.period_month}`,
        persona: clienteNombre,
        fecha: nowIso.slice(0, 10),
        tipo: "ingreso",
        flow_kind: "mensualidad",
        payment_destination: "",
        usd_type: "blue",
        period_month: invoice.period_month,
        ars: null,
        usd: invoice.monto_usd,
        eur: null,
        exchange_snapshot: null,
        updated_at: nowIso,
      };
      const { error: ingresoErr } = await admin.from("crm_ingresos").upsert(ingresoRow);
      if (ingresoErr) return json({ error: ingresoErr.message }, 500);
      const { error: invoiceErr } = await admin.from("crm_invoices").update({ status: "pagada", fecha_pago: nowIso.slice(0, 10), ingreso_id: ingresoRow.id, updated_at: nowIso }).eq("id", invoiceId);
      if (invoiceErr) return json({ error: invoiceErr.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "generate-monthly-invoices") {
      if (roleRank(currentRole) < 2) return json({ error: "Forbidden" }, 403);
      const periodMonth = String(body.period_month || new Date().toISOString().slice(0, 7));
      const [y, m] = periodMonth.split("-").map(Number);
      const vencimiento = new Date(y, m, 10).toISOString().slice(0, 10);
      const { data: clientes } = await admin.from("crm_clientes").select("*").eq("workspace_id", DEFAULT_WORKSPACE_ID).eq("status", "activo");
      const { data: existingInvoices } = await admin.from("crm_invoices").select("id,cliente_id").eq("workspace_id", DEFAULT_WORKSPACE_ID).eq("period_month", periodMonth);
      const existingClienteIds = new Set((existingInvoices || []).map((i: { cliente_id: string }) => i.cliente_id));
      const now = new Date().toISOString();
      const toCreate = (clientes || []).filter((c: Cliente) => c.billing_cycle === "mensual" && !existingClienteIds.has(c.id));
      if (toCreate.length === 0) return json({ ok: true, created: 0 });
      const rows = toCreate.map((c: Cliente) => ({
        id: crypto.randomUUID(),
        workspace_id: DEFAULT_WORKSPACE_ID,
        cliente_id: c.id,
        concepto: `Mensualidad ${periodMonth} - ${c.producto || c.nombre}`,
        period_month: periodMonth,
        monto_usd: c.fee_usd,
        status: "pendiente",
        fecha_emision: now.slice(0, 10),
        fecha_vencimiento: vencimiento,
        created_at: now,
        updated_at: now,
      }));
      const { error } = await admin.from("crm_invoices").insert(rows);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, created: rows.length });
    }

    // ─── Bóveda — solo CEO ────────────────────────────────────────────────────

    if (body.action === "vault-get-meta") {
      if (currentRole !== "ceo") return json({ error: "Forbidden" }, 403);
      const { data } = await admin
        .from("crm_vault_meta")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      return json({ ok: true, meta: data || null });
    }

    if (body.action === "vault-set-meta") {
      if (currentRole !== "ceo") return json({ error: "Forbidden" }, 403);
      if (!payload.kdf_params || !payload.verifier || !payload.verifier_iv)
        return json({ error: "kdf_params, verifier y verifier_iv son requeridos" }, 400);
      const now = new Date().toISOString();
      const row = {
        workspace_id: workspaceId,
        kdf: "pbkdf2",
        kdf_params: payload.kdf_params,
        verifier: String(payload.verifier),
        verifier_iv: String(payload.verifier_iv),
        updated_at: now,
        created_at: now,
      };
      const { error } = await admin.from("crm_vault_meta").upsert(row, { onConflict: "workspace_id" });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "vault-list") {
      if (currentRole !== "ceo") return json({ error: "Forbidden" }, 403);
      const { data, error } = await admin
        .from("crm_vault_items")
        .select("id,tipo,nombre,categoria,cliente,ciphertext,iv,url,created_at,updated_at")
        .eq("workspace_id", workspaceId)
        .order("tipo")
        .order("cliente")
        .order("nombre");
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, items: data || [] });
    }

    if (body.action === "vault-save-item") {
      if (currentRole !== "ceo") return json({ error: "Forbidden" }, 403);
      if (!payload.nombre || !payload.ciphertext || !payload.iv)
        return json({ error: "nombre, ciphertext e iv son requeridos" }, 400);
      const tipo = String(payload.tipo || "servicio");
      if (!["proyecto", "servicio"].includes(tipo))
        return json({ error: "tipo inválido" }, 400);
      const now = new Date().toISOString();
      const row = {
        id: String(payload.id || crypto.randomUUID()),
        workspace_id: workspaceId,
        tipo,
        nombre: String(payload.nombre),
        categoria: String(payload.categoria || "otro"),
        cliente: String(payload.cliente || ""),
        ciphertext: String(payload.ciphertext),
        iv: String(payload.iv),
        url: String(payload.url || ""),
        created_by: user.id,
        updated_at: now,
        created_at: payload.created_at || now,
      };
      const { error } = await admin.from("crm_vault_items").upsert(row);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "vault-delete-item") {
      if (currentRole !== "ceo") return json({ error: "Forbidden" }, 403);
      const { error } = await admin
        .from("crm_vault_items")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("id", body.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "vault-log-audit") {
      if (currentRole !== "ceo") return json({ error: "Forbidden" }, 403);
      const VALID_AUDIT_ACTIONS = new Set(["unlock", "view", "create", "update", "delete"]);
      if (!VALID_AUDIT_ACTIONS.has(body.auditAction))
        return json({ error: "auditAction inválido" }, 400);
      const row = {
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        actor_email: user.email || "",
        action: String(body.auditAction),
        item_id: body.item_id ? String(body.item_id) : null,
        created_at: new Date().toISOString(),
      };
      const { error } = await admin.from("crm_vault_audit").insert(row);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "vault-list-audit") {
      if (currentRole !== "ceo") return json({ error: "Forbidden" }, 403);
      const { data, error } = await admin
        .from("crm_vault_audit")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, entries: data || [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
}
