-- Agrega campo datos jsonb a crm_proposals y crm_onboarding_docs
-- para persistir el contenido estructurado de los documentos generados por la plantilla Meteoro.

alter table public.crm_proposals
  add column if not exists datos jsonb;

alter table public.crm_onboarding_docs
  add column if not exists datos jsonb;
