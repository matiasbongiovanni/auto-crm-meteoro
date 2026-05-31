"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { DEFAULT_SETTINGS, STATE_KEYS } from "@/lib/constants";
import type {
  Agent,
  ApiKey,
  CalendarEvent,
  CompanyNote,
  CrmState,
  FinanceRow,
  Lead,
  OnboardingDoc,
  PendingPayment,
  PipelineCard,
  Profile,
  Proposal,
  Subscription,
  UsageOverview,
} from "@/types/crm";

type ActionStatus = "idle" | "loading" | "success" | "error";

type ActionFeedback = {
  status: ActionStatus;
  message: string | null;
  updatedAt: string;
};

type SessionState = {
  access_token: string;
  user: { email?: string };
};

type RefreshScope = "all" | "finanzas" | "shared" | "proposals";

type ContextValue = {
  state: CrmState;
  usage: UsageOverview | null;
  loading: boolean;
  authReady: boolean;
  session: SessionState | null;
  authError: string | null;
  setAuthError: (value: string | null) => void;
  actionFeedback: Record<string, ActionFeedback>;
  refreshData: (scope?: RefreshScope) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveLead: (lead: Lead) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  saveIngreso: (row: FinanceRow) => Promise<void>;
  deleteIngreso: (id: string) => Promise<void>;
  saveEgreso: (row: FinanceRow) => Promise<void>;
  deleteEgreso: (id: string) => Promise<void>;
  saveSharedState: (key: string, value: unknown) => Promise<void>;
  savePipeline: (cards: PipelineCard[]) => Promise<void>;
  saveAgent: (agent: Agent) => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  createUser: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  saveProposal: (proposal: Proposal) => Promise<void>;
  deleteProposal: (id: string) => Promise<void>;
  createApiKey: (name: string, scopes: ("read" | "write" | "admin")[]) => Promise<{ key: string; apiKey: ApiKey }>;
  revokeApiKey: (id: string) => Promise<void>;
  saveCalendarEvent: (event: CalendarEvent) => Promise<void>;
  deleteCalendarEvent: (id: string) => Promise<void>;
  saveCompanyNote: (note: CompanyNote) => Promise<void>;
  deleteCompanyNote: (id: string) => Promise<void>;
  savePendingPayment: (payment: PendingPayment) => Promise<void>;
  deletePendingPayment: (id: string) => Promise<void>;
  saveOnboardingDoc: (doc: OnboardingDoc) => Promise<void>;
  deleteOnboardingDoc: (id: string) => Promise<void>;
  saveSubscription: (sub: Subscription) => Promise<void>;
};

const CrmContext = createContext<ContextValue | null>(null);

const EMPTY_STATE: CrmState = {
  profile: null,
  profiles: [],
  leads: [],
  pipeline: [],
  ingresos: [],
  egresos: [],
  subscriptions: [],
  agents: [],
  settings: { ...DEFAULT_SETTINGS },
  proposals: [],
  apiKeys: [],
  calendarEvents: [],
  companyNotes: [],
  pendingPayments: [],
  onboardingDocs: [],
};

function toSessionState(session: { access_token: string; user?: { email?: string } } | null | undefined) {
  return session ? { access_token: session.access_token, user: { email: session.user?.email } } : null;
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function scopeFromAction(action: string): RefreshScope {
  if (["save-ingreso", "delete-ingreso", "save-egreso", "delete-egreso"].includes(action)) return "finanzas";
  if (["save-shared-state", "save-pipeline", "save-agent", "save-calendar-event", "delete-calendar-event", "save-company-note", "delete-company-note", "save-pending-payment", "delete-pending-payment"].includes(action)) return "shared";
  if (action === "save-proposal") return "all";
  if (action === "delete-proposal") return "proposals";
  return "all";
}

export function CrmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CrmState>(EMPTY_STATE);
  const [usage, setUsage] = useState<UsageOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<Record<string, ActionFeedback>>({});
  const router = useRouter();

  function setFeedback(key: string, status: ActionStatus, message: string | null = null) {
    setActionFeedback((current) => ({
      ...current,
      [key]: { status, message, updatedAt: new Date().toISOString() },
    }));
  }

  async function refreshUsage() {
    try {
      const result = await fetchJson<UsageOverview & { ok: boolean }>("/api/usage", { cache: "no-store" });
      setUsage(result);
    } catch { setUsage(null); }
  }

  async function refreshData(scope: RefreshScope = "all", currentSession = session) {
    if (!currentSession?.access_token) { setLoading(false); return; }
    const url = scope !== "all" ? `/api/crm?scope=${scope}` : "/api/crm";
    if (scope === "all") setLoading(true);
    try {
      const result = await fetchJson<Partial<CrmState> & { ok: boolean }>(url, {
        headers: { authorization: `Bearer ${currentSession.access_token}` },
        cache: "no-store",
      });
      setState((prev) => {
        if (scope === "finanzas") return { ...prev, ingresos: result.ingresos ?? prev.ingresos, egresos: result.egresos ?? prev.egresos };
        if (scope === "shared") return { ...prev, subscriptions: result.subscriptions ?? prev.subscriptions, pipeline: result.pipeline ?? prev.pipeline, agents: result.agents ?? prev.agents, settings: result.settings ?? prev.settings, calendarEvents: result.calendarEvents ?? prev.calendarEvents, companyNotes: result.companyNotes ?? prev.companyNotes, pendingPayments: result.pendingPayments ?? prev.pendingPayments };
        if (scope === "proposals") return { ...prev, proposals: result.proposals ?? prev.proposals };
        return { profile: result.profile ?? prev.profile, profiles: result.profiles ?? prev.profiles, leads: result.leads ?? prev.leads, pipeline: result.pipeline ?? [], ingresos: result.ingresos ?? prev.ingresos, egresos: result.egresos ?? prev.egresos, subscriptions: result.subscriptions ?? prev.subscriptions, agents: result.agents ?? prev.agents, settings: result.settings ?? prev.settings, proposals: result.proposals ?? prev.proposals, apiKeys: result.apiKeys ?? prev.apiKeys, calendarEvents: result.calendarEvents ?? prev.calendarEvents, companyNotes: result.companyNotes ?? prev.companyNotes, pendingPayments: result.pendingPayments ?? prev.pendingPayments, onboardingDocs: result.onboardingDocs ?? prev.onboardingDocs };
      });
      if (scope === "all") await refreshUsage();
    } finally { if (scope === "all") setLoading(false); }
  }

  async function persist(action: string, body: Record<string, unknown>, feedbackKey = action) {
    if (!session?.access_token) throw new Error("No active session");
    setFeedback(feedbackKey, "loading", "Guardando...");
    await fetchJson("/api/crm", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ action, ...body }) });
    try { await refreshData(scopeFromAction(action)); } catch { /* silent */ }
    setFeedback(feedbackKey, "success", "Guardado");
  }

  async function persistAndRaise(action: string, body: Record<string, unknown>, feedbackKey = action) {
    try { await persist(action, body, feedbackKey); } catch (error) {
      setFeedback(feedbackKey, "error", error instanceof Error ? error.message : "No se pudo guardar");
      throw error;
    }
  }

  async function persistAndReturn<T>(action: string, body: Record<string, unknown>, feedbackKey = action): Promise<T> {
    if (!session?.access_token) throw new Error("No active session");
    setFeedback(feedbackKey, "loading", "Guardando...");
    try {
      const result = await fetchJson<T & { ok: boolean; error?: string }>("/api/crm", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ action, ...body }) });
      await refreshData("all");
      setFeedback(feedbackKey, "success", "Guardado");
      return result;
    } catch (error) {
      setFeedback(feedbackKey, "error", error instanceof Error ? error.message : "No se pudo guardar");
      throw error;
    }
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setAuthReady(true); setLoading(false); return; }

    supabase.auth.getSession().then(({ data }: { data: { session: { access_token: string; user?: { email?: string } } | null } }) => {
      const nextSession = toSessionState(data.session);
      setSession(nextSession);
      setAuthReady(true);
      if (nextSession) refreshData("all", nextSession);
      else refreshUsage().finally(() => setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: unknown, next: { access_token: string; user?: { email?: string } } | null) => {
      const nextSession = toSessionState(next);
      setSession(nextSession);
      if (nextSession) refreshData("all", nextSession);
      else { setState(EMPTY_STATE); setUsage(null); setLoading(false); router.push("/login"); }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<ContextValue>(
    () => ({
      state, usage, loading, authReady, session, authError, setAuthError, actionFeedback,
      refreshData: (scope) => refreshData(scope ?? "all"),
      async signIn(email, password) {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) throw new Error("Supabase no está configurado. Revisá .env.local.");
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const nextSession = toSessionState(data.session);
        if (nextSession) { setSession(nextSession); await refreshData("all", nextSession); }
      },
      async signOut() {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) return;
        await supabase.auth.signOut();
        setSession(null); setState(EMPTY_STATE); setUsage(null);
      },
      saveLead: (lead) => persistAndRaise("save-lead", { item: lead }, `save-lead:${lead.id}`),
      deleteLead: (id) => persistAndRaise("delete-lead", { id }, `delete-lead:${id}`),
      saveIngreso: (row) => persistAndRaise("save-ingreso", { item: row }, `save-ingreso:${row.id}`),
      deleteIngreso: (id) => persistAndRaise("delete-ingreso", { id }, `delete-ingreso:${id}`),
      saveEgreso: (row) => persistAndRaise("save-egreso", { item: row }, `save-egreso:${row.id}`),
      deleteEgreso: (id) => persistAndRaise("delete-egreso", { id }, `delete-egreso:${id}`),
      saveSharedState: (key, value) => persistAndRaise("save-shared-state", { stateKey: key, payload: value }, `save-shared-state:${key}`),
      savePipeline: (cards) => persistAndRaise("save-pipeline", { cards }, "save-pipeline"),
      saveAgent: (agent) => persistAndRaise("save-agent", { item: agent }, `save-agent:${agent.id}`),
      saveProfile: (profile) => persistAndRaise("save-profile", { item: profile }, `save-profile:${profile.id}`),
      deleteProfile: (id) => persistAndRaise("delete-profile", { id }, `delete-profile:${id}`),
      createUser: (email, password, fullName, role) => persistAndRaise("create-profile-user", { email, password, full_name: fullName, role }, "create-profile-user"),
      saveProposal: (proposal) => persistAndRaise("save-proposal", { item: proposal }, `save-proposal:${proposal.id}`),
      deleteProposal: (id) => persistAndRaise("delete-proposal", { id }, `delete-proposal:${id}`),
      createApiKey: (name, scopes) => persistAndReturn<{ key: string; apiKey: ApiKey }>("create-api-key", { name, scopes }, "create-api-key"),
      revokeApiKey: (id) => persistAndRaise("revoke-api-key", { id }, `revoke-api-key:${id}`),
      saveCalendarEvent: (event) => persistAndRaise("save-calendar-event", { item: event }, `save-calendar-event:${event.id}`),
      deleteCalendarEvent: (id) => persistAndRaise("delete-calendar-event", { id }, `delete-calendar-event:${id}`),
      saveCompanyNote: (note) => persistAndRaise("save-company-note", { item: note }, `save-company-note:${note.id}`),
      deleteCompanyNote: (id) => persistAndRaise("delete-company-note", { id }, `delete-company-note:${id}`),
      savePendingPayment: (payment) => persistAndRaise("save-pending-payment", { item: payment }, `save-pending-payment:${payment.id}`),
      deletePendingPayment: (id) => persistAndRaise("delete-pending-payment", { id }, `delete-pending-payment:${id}`),
      saveOnboardingDoc: (doc) => persistAndRaise("save-onboarding-doc", { item: doc }, `save-onboarding-doc:${doc.id}`),
      deleteOnboardingDoc: (id) => persistAndRaise("delete-onboarding-doc", { id }, `delete-onboarding-doc:${id}`),
      saveSubscription: (sub) => {
        const current = state.subscriptions;
        const next = [sub, ...current.filter((s) => s.id !== sub.id)];
        return persistAndRaise("save-shared-state", { stateKey: STATE_KEYS.subscriptions, payload: next }, `save-subscription:${sub.id}`);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actionFeedback, authError, loading, session, state, usage],
  );

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm() {
  const context = useContext(CrmContext);
  if (!context) throw new Error("useCrm must be used within CrmProvider");
  return context;
}
