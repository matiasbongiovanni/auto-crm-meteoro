export type Role = "freelancer" | "admin" | "ceo";

export type Profile = {
  id: string;
  workspace_id?: string;
  user_id: string;
  email: string;
  full_name: string;
  role: Role;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
};

export type LeadTemperatura = "frio" | "tibio" | "caliente";
export type LeadCanal = "whatsapp" | "email" | "llamada" | "otro";

export type Lead = {
  id: string;
  nombre: string;
  origen: string;
  estado: string;
  accion: string;
  notas: string;
  fase: number;
  fecha: string;
  telefono?: string;
  empresa?: string;
  temperatura?: LeadTemperatura;
  ultimo_contacto?: string;
  intentos_contacto?: number;
  canal_contacto?: LeadCanal;
};

export type PipelineStage = "lead" | "contacted" | "in_progress" | "closed";

export type PipelineCard = {
  id: string;
  title: string;
  company: string;
  owner: string;
  stage: PipelineStage;
  value_usd: number | null;
  next_step: string;
  notes: string;
  updated_at: string;
  labels: string[];
};

export type FinanceRow = {
  id: string;
  concepto: string;
  persona?: string;
  fecha: string;
  tipo: string;
  flow_kind: string;
  payment_destination: string;
  usd_type: string;
  period_month: string;
  ars: number | null;
  usd: number | null;
  eur: number | null;
  exchange_snapshot?: unknown;
  cat?: string;
};

export type Subscription = {
  id: string;
  name: string;
  owner: string;
  category: string;
  status: "activa" | "pausada" | "cancelada";
  billing_cycle: string;
  amount_usd: number;
  renewal_date: string;
  notes: string;
  start_date?: string;
  cancelled_at?: string;
};

export type Agent = {
  id: string;
  name: string;
  role: string;
  status: "activo" | "bloqueado" | "pausado";
  priority: "alta" | "media" | "baja";
  task: string;
  owner: string;
  updated_at: string;
  pipeline_stage?: PipelineStage;
  model?: string;
  capabilities?: string[];
};

export type Settings = {
  defaultUsdType: string;
  dashboardScope: "7d" | "30d" | "90d";
  ceoNote: string;
  monthlyGoalUsd: number;
  hideGoalAmount: boolean;
  revenueHiddenByDefault: boolean;
};

export type UsageSnapshot = {
  source: "claude" | "codex";
  period_start: string;
  period_end: string;
  model: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  cost_usd: number | null;
  meta?: Record<string, unknown>;
};

export type UsageSeriesPoint = {
  date: string;
  claude: number;
  codex: number;
};

export type UsageModelBreakdown = {
  source: "claude" | "codex";
  model: string;
  tokens: number;
};

export type UsageOverview = {
  snapshots: UsageSnapshot[];
  series: UsageSeriesPoint[];
  byModel: UsageModelBreakdown[];
  summary: {
    claudeTokens: number;
    codexTokens: number;
    claudeCostUsd: number | null;
    codexCostUsd: number | null;
    combinedTokens: number;
  };
  ingestion: {
    claudeDir: string | null;
    codexDbPath: string | null;
    mode: "local" | "disabled";
    available: boolean;
    reason: string | null;
  };
};

export type ProposalStatus = "enviado" | "en_negociacion" | "aceptado" | "rechazado" | "vencido";

export type Proposal = {
  id: string;
  cliente: string;
  concepto: string;
  monto_usd: number | null;
  fecha_envio: string;
  proximo_seguimiento: string | null;
  estado: ProposalStatus;
  link_documento: string | null;
  notas: string;
  datos?: import("@/lib/documents/types").PresupuestoData | null;
  created_at?: string;
  updated_at?: string;
};


export type OnboardingDocStatus = "borrador" | "enviado" | "firmado";
export type OnboardingDocTipo = "bienvenida" | "onboarding";

export type OnboardingDoc = {
  id: string;
  cliente: string;
  empresa?: string | null;
  tipo: OnboardingDocTipo;
  fecha: string;
  estado: OnboardingDocStatus;
  notas?: string;
  datos?: import("@/lib/documents/types").BienvenidaData | import("@/lib/documents/types").OnboardingData | null;
  created_at?: string;
  updated_at?: string;
};

export type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: ("read" | "write" | "admin")[];
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

export type CalendarEventType = "tarea" | "reunion" | "seguimiento" | "entrega" | "cobro";

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  company?: string;
  type: CalendarEventType;
  completed: boolean;
  notes: string;
  created_at: string;
};

export type CompanyNote = {
  id: string;
  company: string;
  content: string;
  updated_at: string;
};

export type PendingPaymentStatus = "pendiente" | "parcial" | "cobrado";

export type PendingPayment = {
  id: string;
  cliente: string;
  concepto: string;
  monto_usd: number | null;
  fecha_entrega: string;
  fecha_vencimiento?: string | null;
  estado: PendingPaymentStatus;
  notas: string;
  created_at: string;
  ingreso_id?: string | null;
  cobrado_registered_at?: string | null;
};

export type CrmState = {
  profile: Profile | null;
  profiles: Profile[];
  leads: Lead[];
  pipeline: PipelineCard[];
  ingresos: FinanceRow[];
  egresos: FinanceRow[];
  subscriptions: Subscription[];
  agents: Agent[];
  settings: Settings;
  proposals: Proposal[];
  apiKeys: ApiKey[];
  calendarEvents: CalendarEvent[];
  companyNotes: CompanyNote[];
  pendingPayments: PendingPayment[];
  onboardingDocs: OnboardingDoc[];
};
