-- ============================================================
-- MIGRACIÓN: Consolidación de datos Supabase — 2026-06-01
-- REQUIERE CONFIRMACIÓN MANUAL ANTES DE EJECUTAR
-- Proyecto: qrrhfxcnbssxdofkqsst.supabase.co
-- ============================================================
-- HACER BACKUP ANTES:
--   select * from crm_profiles;
--   select * from crm_ingresos;
--   select * from crm_state;
-- ============================================================

-- PASO 1: Normalizar workspace_id de matias (quitar el \n corrupto)
-- Estado actual: workspace_id = '00000000-0000-0000-0000-000000000001\n'
-- Target: workspace_id = 'workspace:meteoro'
UPDATE crm_profiles
SET workspace_id = 'workspace:meteoro', updated_at = now()
WHERE id = 'f98647cc-81d2-4ed6-9b3c-71b2a55c7c19'
  AND workspace_id != 'workspace:meteoro';

-- PASO 2: Consolidar crm_state del contenedor corrupto → workspace:meteoro
-- (Mover cada state_key que NO exista ya en workspace:meteoro)
-- Claves bajo '00000000-0000-0000-0000-000000000001\n':
--   exp2_subscriptions, exp2_settings, exp2_pipeline,
--   exp2_calendar, exp2_pending_payments, exp2_proposals, exp2_company_notes

-- Para cada key, insertar en workspace:meteoro si no existe ya, luego borrar la corrupta.
-- Ejecutar key por key (adaptar si hay conflicto de ON CONFLICT):

INSERT INTO crm_state (user_id, state_key, payload, updated_at)
SELECT 'workspace:meteoro', state_key, payload, now()
FROM crm_state
WHERE user_id = E'00000000-0000-0000-0000-000000000001\n'
ON CONFLICT (user_id, state_key) DO NOTHING;

-- Borrar las filas del contenedor corrupto DESPUÉS de verificar que se movieron:
-- DELETE FROM crm_state WHERE user_id = E'00000000-0000-0000-0000-000000000001\n';

-- PASO 3: Reasignar los 11 ingresos de test@test.com a matias@meteoro.com
-- test@test.com: id = 9bcd079e-...
-- matias@meteoro.com: id = f98647cc-...
UPDATE crm_ingresos
SET user_id = 'f98647cc-81d2-4ed6-9b3c-71b2a55c7c19'
WHERE user_id = '9bcd079e-c7b6-4e45-88a0-9f3b9d2a1e8f';

-- PASO 4: DE-DUP — Verificar duplicados antes de borrar
-- Ejecutar primero solo como SELECT para revisar:
/*
SELECT a.id AS dup_id, a.concepto, a.persona, a.fecha, a.usd
FROM crm_ingresos a
JOIN crm_ingresos b ON
  a.concepto = b.concepto AND
  a.usd = b.usd AND
  a.fecha = b.fecha AND
  a.user_id = b.user_id AND  -- mismo user (después del UPDATE del paso 3)
  a.id > b.id                -- el de mayor id es el duplicado
WHERE a.user_id = 'f98647cc-81d2-4ed6-9b3c-71b2a55c7c19';
*/
-- Luego borrar los duplicados (reemplazar los IDs con los que devuelva el SELECT anterior):
-- DELETE FROM crm_ingresos WHERE id IN ('id-dup-1', 'id-dup-2');

-- PASO 5 (OPCIONAL): Degradar test@test.com
-- UPDATE crm_profiles SET role = 'freelancer', status = 'inactive' WHERE id = '9bcd079e-...';
-- O eliminar: DELETE FROM crm_profiles WHERE id = '9bcd079e-...';
