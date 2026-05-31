-- ================================================================
-- METEORO CRM — Schema Supabase
-- Ejecutar en: https://supabase.com/dashboard/project/qrrhfxcnbssxdofkqsst/sql
-- ================================================================

-- NOTA: Las tablas crm_leads, crm_ingresos, crm_egresos, crm_state
-- ya existen en el proyecto. Este schema documenta todas las migraciones
-- y agrega las tablas faltantes si corresponde.

-- ─── Perfiles de usuarios ──────────────────────────────────────────────────
create table if not exists public.crm_profiles (
  id text primary key,
  workspace_id text not null default 'workspace:meteoro',
  user_id text not null,
  email text not null,
  full_name text default '',
  role text not null default 'freelancer' check (role in ('ceo','admin','freelancer')),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_profiles_workspace_idx on public.crm_profiles (workspace_id, updated_at desc);
create unique index if not exists crm_profiles_workspace_user_idx on public.crm_profiles (workspace_id, user_id);

-- Solo un CEO por workspace
create unique index if not exists one_ceo_per_workspace on public.crm_profiles (workspace_id) where (role = 'ceo');

-- ─── Ingresos ──────────────────────────────────────────────────────────────
alter table public.crm_ingresos add column if not exists flow_kind text default 'mensualidad';
alter table public.crm_ingresos add column if not exists payment_destination text default '';
alter table public.crm_ingresos add column if not exists usd_type text default 'blue';
alter table public.crm_ingresos add column if not exists period_month text;
alter table public.crm_ingresos add column if not exists exchange_snapshot jsonb;

update public.crm_ingresos
  set period_month = substring(fecha from 1 for 7)
  where period_month is null and fecha is not null;

-- ─── Egresos ───────────────────────────────────────────────────────────────
alter table public.crm_egresos add column if not exists flow_kind text default 'operacion';
alter table public.crm_egresos add column if not exists payment_destination text default '';
alter table public.crm_egresos add column if not exists usd_type text default 'blue';
alter table public.crm_egresos add column if not exists period_month text;
alter table public.crm_egresos add column if not exists exchange_snapshot jsonb;

update public.crm_egresos
  set period_month = substring(fecha from 1 for 7)
  where period_month is null and fecha is not null;

-- ─── crm_state — namespaced por state_key ──────────────────────────────────
-- Cambiar user_id de UUID a TEXT (necesario para usar "workspace:meteoro")
alter table public.crm_state alter column user_id type text using user_id::text;

-- Unique constraint para upsert correcto
delete from public.crm_state a using public.crm_state b
  where a.ctid < b.ctid and a.user_id = b.user_id and a.state_key = b.state_key;

alter table public.crm_state
  add constraint if not exists crm_state_user_state_key unique (user_id, state_key);

-- ─── Leads — campos de prospección ────────────────────────────────────────
alter table public.crm_leads add column if not exists telefono text;
alter table public.crm_leads add column if not exists empresa text;
alter table public.crm_leads add column if not exists temperatura text default 'frio'
  check (temperatura in ('frio','tibio','caliente'));
alter table public.crm_leads add column if not exists ultimo_contacto timestamptz;
alter table public.crm_leads add column if not exists intentos_contacto integer not null default 0;
alter table public.crm_leads add column if not exists canal_contacto text
  check (canal_contacto in ('whatsapp','email','llamada','otro'));

create index if not exists idx_crm_leads_prospecting
  on public.crm_leads(user_id, temperatura, ultimo_contacto nulls first);

-- ─── Presupuestos ──────────────────────────────────────────────────────────
create table if not exists public.crm_proposals (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null default 'workspace:meteoro',
  user_id text not null,
  cliente text not null,
  concepto text not null,
  monto_usd numeric(12,2),
  fecha_envio date not null default current_date,
  proximo_seguimiento date,
  estado text not null default 'enviado'
    check (estado in ('enviado','en_negociacion','aceptado','rechazado','vencido')),
  link_documento text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_crm_proposals_workspace
  on public.crm_proposals(workspace_id, proximo_seguimiento nulls last);

-- ─── API Keys ──────────────────────────────────────────────────────────────
create table if not exists public.crm_api_keys (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null default 'workspace:meteoro',
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default array['read'],
  created_by text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists idx_crm_api_keys_workspace on public.crm_api_keys(workspace_id);
create index if not exists idx_crm_api_keys_hash on public.crm_api_keys(key_hash) where revoked_at is null;

-- ─── Onboarding docs ───────────────────────────────────────────────────────
create table if not exists public.crm_onboarding_docs (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null default 'workspace:meteoro',
  user_id text not null,
  cliente text not null,
  empresa text,
  tipo text not null default 'bienvenida' check (tipo in ('bienvenida','onboarding')),
  fecha date not null default current_date,
  estado text not null default 'borrador' check (estado in ('borrador','enviado','firmado')),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_crm_onboarding_workspace
  on public.crm_onboarding_docs(workspace_id, created_at desc);

-- ─── Usage snapshots (opcional) ────────────────────────────────────────────
create table if not exists public.usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'workspace:meteoro',
  source text not null check (source in ('claude','codex')),
  period_start date not null,
  period_end date not null,
  model text not null,
  total_tokens bigint not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cache_tokens bigint not null default 0,
  cost_usd numeric(12,4),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists usage_snapshots_unique_period_model_idx
  on public.usage_snapshots (workspace_id, source, period_start, period_end, model);
