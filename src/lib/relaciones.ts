import type {
  CalendarEvent,
  Cliente,
  CompanyNote,
  CrmState,
  Invoice,
  Lead,
  PipelineCard,
  Subscription,
} from "@/types/crm";

/** Normaliza un nombre de empresa para comparar (trim + lowercase + colapsa espacios). */
export function normalizeEmpresa(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Devuelve true si dos nombres de empresa refieren a la misma (match flexible). */
function sameEmpresa(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeEmpresa(a);
  const nb = normalizeEmpresa(b);
  if (!na || !nb) return false;
  return na === nb;
}

export type BacklinkKind =
  | "lead"
  | "cliente"
  | "evento"
  | "nota"
  | "invoice"
  | "pipeline"
  | "suscripcion";

export type Backlink = {
  kind: BacklinkKind;
  label: string;
  sublabel?: string;
  href: string;
};

export type EmpresaResumen = {
  empresa: string;
  leads: Lead[];
  cliente: Cliente | null;
  eventos: CalendarEvent[];
  notas: CompanyNote[];
  invoices: Invoice[];
  pipelineCards: PipelineCard[];
  suscripciones: Subscription[];
  backlinks: Backlink[];
  totalConexiones: number;
};

/**
 * Agrega TODO lo relacionado a una empresa a través de las distintas fuentes del CRM.
 * Match por nombre normalizado contra: leads (empresa/nombre), clientes (empresa/nombre),
 * eventos (company), notas (company), pipeline (company), invoices (vía cliente_id),
 * suscripciones (name/owner).
 */
export function getEmpresaResumen(empresa: string, state: CrmState): EmpresaResumen {
  const target = empresa;

  const leads = state.leads.filter(
    (l) => sameEmpresa(l.empresa, target) || sameEmpresa(l.nombre, target),
  );

  const cliente =
    state.clientes.find(
      (c) => sameEmpresa(c.empresa, target) || sameEmpresa(c.nombre, target),
    ) || null;

  const eventos = state.calendarEvents.filter((e) => sameEmpresa(e.company, target));
  const notas = state.companyNotes.filter((n) => sameEmpresa(n.company, target));
  const pipelineCards = state.pipeline.filter((p) => sameEmpresa(p.company, target));

  const invoices = cliente
    ? state.invoices.filter((i) => i.cliente_id === cliente.id)
    : [];

  const suscripciones = state.subscriptions.filter(
    (s) => sameEmpresa(s.name, target) || sameEmpresa(s.owner, target),
  );

  const backlinks: Backlink[] = [];
  if (cliente) {
    backlinks.push({
      kind: "cliente",
      label: cliente.producto || "Cliente activo",
      sublabel: cliente.status,
      href: "/clientes",
    });
  }
  for (const l of leads) {
    backlinks.push({ kind: "lead", label: l.nombre || "Lead", sublabel: l.estado, href: "/leads" });
  }
  for (const p of pipelineCards) {
    backlinks.push({ kind: "pipeline", label: p.title, sublabel: p.stage, href: "/pipeline" });
  }
  for (const e of eventos) {
    backlinks.push({
      kind: "evento",
      label: e.title,
      sublabel: `${e.date}${e.time ? ` · ${e.time}` : ""}`,
      href: "/calendario",
    });
  }
  for (const i of invoices) {
    backlinks.push({
      kind: "invoice",
      label: i.concepto || `Factura ${i.period_month}`,
      sublabel: i.status,
      href: "/finanzas",
    });
  }
  for (const n of notas) {
    backlinks.push({ kind: "nota", label: "Nota", sublabel: n.company, href: "/tareas" });
  }
  for (const s of suscripciones) {
    backlinks.push({ kind: "suscripcion", label: s.name, sublabel: s.status, href: "/finanzas" });
  }

  return {
    empresa,
    leads,
    cliente,
    eventos,
    notas,
    invoices,
    pipelineCards,
    suscripciones,
    backlinks,
    totalConexiones: backlinks.length,
  };
}

/** Lista única de empresas detectadas en todas las fuentes (para command palette / autocompletes). */
export function listEmpresas(state: CrmState): string[] {
  const map = new Map<string, string>(); // normalized -> display
  const add = (s: string | null | undefined) => {
    const n = normalizeEmpresa(s);
    if (!n) return;
    if (!map.has(n)) map.set(n, (s as string).trim());
  };
  state.clientes.forEach((c) => add(c.empresa || c.nombre));
  state.leads.forEach((l) => add(l.empresa || l.nombre));
  state.calendarEvents.forEach((e) => add(e.company));
  state.companyNotes.forEach((n) => add(n.company));
  state.pipeline.forEach((p) => add(p.company));
  state.subscriptions.forEach((s) => add(s.name));
  return [...map.values()].sort((a, b) => a.localeCompare(b));
}
