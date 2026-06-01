import type { Temperature, LeadSource, ActivityType } from "@/types";

// ─── CRM Workspace ────────────────────────────────────────────────────────────
export const DEFAULT_WORKSPACE_ID = process.env.CRM_WORKSPACE_ID || "workspace:meteoro";

export const STATE_KEYS = {
  subscriptions: "exp2_subscriptions",
  agents: "exp2_agents",
  pipeline: "exp2_pipeline",
  settings: "exp2_settings",
  calendar: "exp2_calendar",
  companyNotes: "exp2_company_notes",
  pendingPayments: "exp2_pending_payments",
  proposals: "exp2_proposals",
} as const;

export const SHARED_STATE_KEYS = new Set<string>(Object.values(STATE_KEYS));

export const DEFAULT_SETTINGS = {
  defaultUsdType: "blue",
  dashboardScope: "30d",
  ceoNote: "",
  monthlyGoalUsd: 0,
  hideGoalAmount: false,
  revenueHiddenByDefault: false,
} as const;

// ─── Lead / Contact ────────────────────────────────────────────────────────────
export const TEMPERATURE_CONFIG: Record<
  Temperature,
  { label: string; color: string; bgColor: string }
> = {
  cold: { label: "Frio", color: "#64748b", bgColor: "#f1f5f9" },
  warm: { label: "Tibio", color: "#ea580c", bgColor: "#fff7ed" },
  hot: { label: "Caliente", color: "#dc2626", bgColor: "#fef2f2" },
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  website: "Sitio web",
  whatsapp: "WhatsApp",
  referido: "Referido",
  redes_sociales: "Redes sociales",
  llamada_fria: "Llamada fria",
  email: "Email",
  formulario: "Formulario",
  evento: "Evento",
  import: "Importado",
  webhook: "Webhook",
  otro: "Otro",
};

export const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { label: string; icon: string }
> = {
  call: { label: "Llamada", icon: "Phone" },
  email: { label: "Email", icon: "Mail" },
  meeting: { label: "Reunion", icon: "Users" },
  note: { label: "Nota", icon: "FileText" },
  follow_up: { label: "Seguimiento", icon: "Clock" },
};

// ─── Formatting ────────────────────────────────────────────────────────────────
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(cents / 100);
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function cleanPhoneForWhatsApp(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "");
}

function toDate(date: Date | number): Date {
  if (date instanceof Date) return date;
  return new Date(date < 1e12 ? date * 1000 : date);
}

export function formatDate(date: Date | number | null): string {
  if (!date) return "-";
  const d = toDate(date);
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatRelativeDate(date: Date | number): string {
  const d = toDate(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  return formatDate(date);
}
