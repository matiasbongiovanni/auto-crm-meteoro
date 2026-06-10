-- ================================================================
-- METEORO CRM — Bóveda v2 (2026-06-10)
-- Idempotente: seguro de ejecutar aunque ya existan tablas/columnas/políticas.
-- Agrega: tipo (proyecto|servicio) para separar creds de clientes vs infra.
-- ================================================================

-- ─── Extensiones en crm_leads (si la tabla existe) ────────────────────────
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='crm_leads') then
    alter table public.crm_leads add column if not exists workspace_id text not null default 'workspace:meteoro';
    alter table public.crm_leads add column if not exists email text;
    alter table public.crm_leads add column if not exists nicho text;
    alter table public.crm_leads add column if not exists ciudad text;
    alter table public.crm_leads add column if not exists pais text;
    alter table public.crm_leads add column if not exists ig_handle text;
    alter table public.crm_leads add column if not exists dedupe_hash text;
  end if;
end $$;

-- Índice único parcial para deduplicación (solo si crm_leads existe)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='crm_leads') then
    if not exists (select 1 from pg_indexes where schemaname='public' and tablename='crm_leads' and indexname='idx_crm_leads_dedupe') then
      create unique index idx_crm_leads_dedupe
        on public.crm_leads(workspace_id, dedupe_hash)
        where dedupe_hash is not null;
    end if;
  end if;
end $$;

-- ─── Cola de jobs de scraping ──────────────────────────────────────────────
create table if not exists public.crm_lead_jobs (
  id          text primary key default gen_random_uuid()::text,
  workspace_id text not null default 'workspace:meteoro',
  type        text not null check (type in ('maps', 'instagram')),
  params      jsonb not null default '{}',
  status      text not null default 'pending'
              check (status in ('pending', 'running', 'done', 'error')),
  result_count integer not null default 0,
  error_msg   text,
  created_by  text,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);

create index if not exists idx_crm_lead_jobs_status
  on public.crm_lead_jobs(workspace_id, status, created_at desc);

-- ─── Bóveda — metadata del workspace ──────────────────────────────────────
create table if not exists public.crm_vault_meta (
  workspace_id text primary key,
  kdf          text not null default 'pbkdf2' check (kdf in ('pbkdf2')),
  kdf_params   jsonb not null default '{}',
  verifier     text not null,
  verifier_iv  text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── Bóveda — items cifrados ───────────────────────────────────────────────
create table if not exists public.crm_vault_items (
  id           text primary key default gen_random_uuid()::text,
  workspace_id text not null default 'workspace:meteoro',
  tipo         text not null default 'servicio' check (tipo in ('proyecto', 'servicio')),
  nombre       text not null,
  categoria    text not null default 'otro',
  cliente      text not null default '',
  ciphertext   text not null,
  iv           text not null,
  url          text not null default '',
  created_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Agregar columna tipo si la tabla ya existía sin ella
alter table public.crm_vault_items
  add column if not exists tipo text not null default 'servicio';

-- Agregar constraint check si no existe (Postgres lo ignora si ya está)
do $$ begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'crm_vault_items_tipo_check'
  ) then
    alter table public.crm_vault_items
      add constraint crm_vault_items_tipo_check check (tipo in ('proyecto', 'servicio'));
  end if;
exception when others then null;
end $$;

create index if not exists idx_crm_vault_items_workspace
  on public.crm_vault_items(workspace_id, tipo, categoria, nombre);

-- ─── Bóveda — auditoría append-only ───────────────────────────────────────
create table if not exists public.crm_vault_audit (
  id           text primary key default gen_random_uuid()::text,
  workspace_id text not null default 'workspace:meteoro',
  actor_email  text not null,
  action       text not null check (action in ('unlock', 'view', 'create', 'update', 'delete')),
  item_id      text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_crm_vault_audit_workspace
  on public.crm_vault_audit(workspace_id, created_at desc);

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table public.crm_vault_meta    enable row level security;
alter table public.crm_vault_items   enable row level security;
alter table public.crm_vault_audit   enable row level security;
alter table public.crm_lead_jobs     enable row level security;

-- Limpiar políticas anteriores para evitar conflictos en re-ejecución
drop policy if exists "vault_meta_admin"         on public.crm_vault_meta;
drop policy if exists "vault_items_admin"        on public.crm_vault_items;
drop policy if exists "vault_audit_admin"        on public.crm_vault_audit;
drop policy if exists "vault_audit_insert_only"  on public.crm_vault_audit;
drop policy if exists "lead_jobs_admin"          on public.crm_lead_jobs;

-- La app usa service_role (bypassa RLS).
-- Estas políticas protegen ante conexiones directas con anon key.

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

create policy "vault_audit_read" on public.crm_vault_audit
  for select using (
    exists (
      select 1 from public.crm_profiles
      where user_id = auth.uid()::text
        and role in ('ceo', 'admin')
    )
  );

-- append-only: insert permitido, update/delete bloqueados por ausencia de política
create policy "vault_audit_insert" on public.crm_vault_audit
  for insert with check (
    exists (
      select 1 from public.crm_profiles
      where user_id = auth.uid()::text
        and role in ('ceo', 'admin')
    )
  );

create policy "lead_jobs_admin" on public.crm_lead_jobs
  for all using (
    exists (
      select 1 from public.crm_profiles
      where user_id = auth.uid()::text
        and role in ('ceo', 'admin')
    )
  );
