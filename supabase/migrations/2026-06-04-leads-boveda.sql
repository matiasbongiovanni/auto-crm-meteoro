-- ================================================================
-- METEORO CRM — Migración 2026-06-04
-- Generador de leads (cola de jobs) + Bóveda de contraseñas zero-knowledge
-- REQUIERE CONFIRMACIÓN EXPLÍCITA antes de ejecutar en Supabase
-- ================================================================

-- ─── Extensiones extras en crm_leads ──────────────────────────────────────
alter table public.crm_leads add column if not exists workspace_id text not null default 'workspace:meteoro';
alter table public.crm_leads add column if not exists email text;
alter table public.crm_leads add column if not exists nicho text;
alter table public.crm_leads add column if not exists ciudad text;
alter table public.crm_leads add column if not exists pais text;
alter table public.crm_leads add column if not exists ig_handle text;
alter table public.crm_leads add column if not exists dedupe_hash text;

-- Índice único parcial para deduplicación (workspace + hash)
create unique index if not exists idx_crm_leads_dedupe
  on public.crm_leads(workspace_id, dedupe_hash)
  where dedupe_hash is not null;

-- ─── Cola de jobs de scraping ──────────────────────────────────────────────
create table if not exists public.crm_lead_jobs (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null default 'workspace:meteoro',
  type text not null check (type in ('maps', 'instagram')),
  params jsonb not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'error')),
  result_count integer not null default 0,
  error_msg text,
  created_by text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists idx_crm_lead_jobs_status
  on public.crm_lead_jobs(workspace_id, status, created_at desc);

-- ─── Bóveda — metadata del workspace ──────────────────────────────────────
-- Guarda parámetros KDF y blob verificador; nunca guarda la passphrase.
create table if not exists public.crm_vault_meta (
  workspace_id text primary key,
  kdf text not null default 'pbkdf2' check (kdf in ('pbkdf2')),
  kdf_params jsonb not null default '{}',  -- { salt, iterations }
  verifier text not null,                  -- AES-GCM del texto fijo, base64
  verifier_iv text not null,               -- IV del verifier, base64
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Bóveda — items cifrados ───────────────────────────────────────────────
-- El servidor solo almacena ciphertext; nunca ve el plaintext.
create table if not exists public.crm_vault_items (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null default 'workspace:meteoro',
  -- Nombre y categoría van en claro (navegabilidad de la lista)
  nombre text not null,
  categoria text not null default 'general',
  cliente text default '',
  -- Todo lo sensible va cifrado con AES-256-GCM:
  ciphertext text not null,   -- base64
  iv text not null,           -- base64, 12 bytes random por item
  -- Metadatos opcionales no sensibles:
  url text default '',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_vault_items_workspace
  on public.crm_vault_items(workspace_id, categoria, nombre);

-- ─── Bóveda — auditoría append-only ───────────────────────────────────────
create table if not exists public.crm_vault_audit (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null default 'workspace:meteoro',
  actor_email text not null,
  action text not null check (action in ('unlock', 'view', 'create', 'update', 'delete')),
  item_id text,  -- null para unlock
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_vault_audit_workspace
  on public.crm_vault_audit(workspace_id, created_at desc);

-- ─── RLS (defensa en profundidad) ─────────────────────────────────────────
-- La app escribe con service_role (bypassa RLS).
-- RLS protege ante consultas directas con anon key.

alter table public.crm_vault_meta enable row level security;
alter table public.crm_vault_items enable row level security;
alter table public.crm_vault_audit enable row level security;

-- Solo ceo/admin pueden leer/escribir bóveda vía RLS
create policy "vault_meta_admin" on public.crm_vault_meta
  for all using (
    exists (
      select 1 from public.crm_profiles
      where user_id = auth.uid()::text
        and role in ('ceo', 'admin')
    )
  );

create policy "vault_items_admin" on public.crm_vault_items
  for all using (
    exists (
      select 1 from public.crm_profiles
      where user_id = auth.uid()::text
        and role in ('ceo', 'admin')
    )
  );

create policy "vault_audit_admin" on public.crm_vault_audit
  for select using (
    exists (
      select 1 from public.crm_profiles
      where user_id = auth.uid()::text
        and role in ('ceo', 'admin')
    )
  );

-- La auditoría es append-only: no se puede modificar ni borrar
create policy "vault_audit_insert_only" on public.crm_vault_audit
  for insert with check (
    exists (
      select 1 from public.crm_profiles
      where user_id = auth.uid()::text
        and role in ('ceo', 'admin')
    )
  );
