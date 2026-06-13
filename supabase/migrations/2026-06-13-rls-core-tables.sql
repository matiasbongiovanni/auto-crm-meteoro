-- ================================================================
-- METEORO CRM — RLS en tablas core (cierre de bypass del anon key)
-- Ejecutar en: https://supabase.com/dashboard/project/qrrhfxcnbssxdofkqsst/sql
-- ================================================================
--
-- CONTEXTO:
-- NEXT_PUBLIC_SUPABASE_ANON_KEY viaja al browser. Estas tablas NO tenían RLS,
-- por lo que cualquiera con ese key podía leer/escribir directo contra la REST
-- API de Supabase, salteándose el middleware y el allowlist de email.
--
-- ESTRATEGIA: deny-all.
-- Se habilita RLS y NO se crean políticas para anon/authenticated => acceso
-- denegado para esos roles. El servidor del CRM accede siempre con
-- SUPABASE_SERVICE_ROLE_KEY (rol service_role, atributo BYPASSRLS), por lo que
-- sigue funcionando igual. Verificado: ningún código client-side consulta estas
-- tablas con el anon key (el browser client solo se usa para Auth).
-- ================================================================

alter table public.crm_leads           enable row level security;
alter table public.crm_ingresos        enable row level security;
alter table public.crm_egresos         enable row level security;
alter table public.crm_state           enable row level security;
alter table public.crm_profiles        enable row level security;
alter table public.crm_api_keys        enable row level security;
alter table public.crm_onboarding_docs enable row level security;
alter table public.crm_proposals       enable row level security;

-- ── Verificación (opcional, correr después) ─────────────────────────────────
-- Debe listar las 8 tablas con rowsecurity = true:
--
--   select tablename, rowsecurity
--   from pg_tables
--   where schemaname = 'public'
--     and tablename in (
--       'crm_leads','crm_ingresos','crm_egresos','crm_state',
--       'crm_profiles','crm_api_keys','crm_onboarding_docs','crm_proposals'
--     )
--   order by tablename;
