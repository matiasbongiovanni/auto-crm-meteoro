-- ================================================================
-- METEORO CRM — Portal de Clientes
-- Aplicar en: https://supabase.com/dashboard/project/qrrhfxcnbssxdofkqsst/sql
-- REQUIERE CONFIRMACIÓN DE MATI ANTES DE EJECUTAR
-- ================================================================

-- ─── Portal: Proyectos ─────────────────────────────────────────────────────
create table if not exists public.portal_projects (
  id text primary key default gen_random_uuid()::text,
  cliente_id text not null references public.crm_clientes(id) on delete cascade,
  slug text not null unique,
  nombre_proyecto text not null,
  descripcion text default '',
  porcentaje_manual integer check (porcentaje_manual between 0 and 100),
  fecha_inicio date not null default current_date,
  fecha_estimada date,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_portal_projects_slug on public.portal_projects (slug);
create index if not exists idx_portal_projects_cliente on public.portal_projects (cliente_id);

-- ─── Portal: Tareas ────────────────────────────────────────────────────────
create table if not exists public.portal_tasks (
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.portal_projects(id) on delete cascade,
  titulo text not null,
  descripcion text default '',
  status text not null default 'pendiente' check (status in ('pendiente','en_progreso','completada')),
  category text not null default 'desarrollo' check (category in ('diseno','desarrollo','contenido','testing','entrega','otro')),
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_portal_tasks_project on public.portal_tasks (project_id, orden);

-- ─── Portal: Updates / Timeline ───────────────────────────────────────────
create table if not exists public.portal_updates (
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.portal_projects(id) on delete cascade,
  mensaje text not null,
  tipo text not null default 'avance' check (tipo in ('hito','avance','entrega','nota')),
  fecha date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_portal_updates_project on public.portal_updates (project_id, fecha desc);

-- ─── Portal: Usuarios cliente ──────────────────────────────────────────────
create table if not exists public.portal_users (
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.portal_projects(id) on delete cascade,
  email text not null unique,
  nombre text not null,
  supabase_user_id text,
  invited_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_portal_users_email on public.portal_users (email);
create index if not exists idx_portal_users_supabase on public.portal_users (supabase_user_id);

-- ─── RLS (Row Level Security) ─────────────────────────────────────────────
alter table public.portal_projects enable row level security;
alter table public.portal_tasks enable row level security;
alter table public.portal_updates enable row level security;
alter table public.portal_users enable row level security;

-- Service role tiene acceso total (las API routes del CRM usan service role key)
create policy "service_role_all_portal_projects" on public.portal_projects
  for all using (true) with check (true);
create policy "service_role_all_portal_tasks" on public.portal_tasks
  for all using (true) with check (true);
create policy "service_role_all_portal_updates" on public.portal_updates
  for all using (true) with check (true);
create policy "service_role_all_portal_users" on public.portal_users
  for all using (true) with check (true);
