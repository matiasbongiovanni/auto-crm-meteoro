-- ============================================================
-- Fase 1: Cartera de Clientes + Cobranzas
-- Aplicar en: Supabase SQL Editor (qrrhfxcnbssxdofkqsst)
-- ⚠️ Requiere confirmación de Mati antes de ejecutar
-- ============================================================

-- ─── Tabla: crm_clientes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_clientes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    TEXT NOT NULL DEFAULT 'workspace:meteoro',
  user_id         UUID REFERENCES auth.users(id),
  nombre          TEXT NOT NULL,
  empresa         TEXT,
  contacto        TEXT,
  telefono        TEXT,
  email           TEXT,
  status          TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'pausado', 'churned')),
  producto        TEXT NOT NULL DEFAULT '',
  fee_usd         NUMERIC(10,2) NOT NULL DEFAULT 0,
  billing_cycle   TEXT NOT NULL DEFAULT 'mensual' CHECK (billing_cycle IN ('mensual', 'trimestral', 'anual', 'unico')),
  fecha_alta      DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_renovacion DATE,
  owner           TEXT,
  contexto_path   TEXT,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_clientes_workspace ON crm_clientes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_clientes_status    ON crm_clientes(status);

ALTER TABLE crm_clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clientes_workspace_select" ON crm_clientes;
CREATE POLICY "clientes_workspace_select" ON crm_clientes
  FOR SELECT USING (workspace_id = 'workspace:meteoro');

DROP POLICY IF EXISTS "clientes_workspace_insert" ON crm_clientes;
CREATE POLICY "clientes_workspace_insert" ON crm_clientes
  FOR INSERT WITH CHECK (workspace_id = 'workspace:meteoro');

DROP POLICY IF EXISTS "clientes_workspace_update" ON crm_clientes;
CREATE POLICY "clientes_workspace_update" ON crm_clientes
  FOR UPDATE USING (workspace_id = 'workspace:meteoro');

DROP POLICY IF EXISTS "clientes_workspace_delete" ON crm_clientes;
CREATE POLICY "clientes_workspace_delete" ON crm_clientes
  FOR DELETE USING (workspace_id = 'workspace:meteoro');

-- ─── Tabla: crm_invoices ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_invoices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     TEXT NOT NULL DEFAULT 'workspace:meteoro',
  cliente_id       UUID NOT NULL REFERENCES crm_clientes(id) ON DELETE CASCADE,
  concepto         TEXT NOT NULL DEFAULT '',
  period_month     TEXT NOT NULL, -- YYYY-MM
  monto_usd        NUMERIC(10,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'pagada', 'vencida', 'anulada')),
  fecha_emision    DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE NOT NULL,
  fecha_pago       DATE,
  ingreso_id       TEXT,
  notas            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_invoices_workspace    ON crm_invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_invoices_cliente      ON crm_invoices(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_invoices_period       ON crm_invoices(period_month);
CREATE INDEX IF NOT EXISTS idx_crm_invoices_status       ON crm_invoices(status);

ALTER TABLE crm_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_workspace_select" ON crm_invoices;
CREATE POLICY "invoices_workspace_select" ON crm_invoices
  FOR SELECT USING (workspace_id = 'workspace:meteoro');

DROP POLICY IF EXISTS "invoices_workspace_insert" ON crm_invoices;
CREATE POLICY "invoices_workspace_insert" ON crm_invoices
  FOR INSERT WITH CHECK (workspace_id = 'workspace:meteoro');

DROP POLICY IF EXISTS "invoices_workspace_update" ON crm_invoices;
CREATE POLICY "invoices_workspace_update" ON crm_invoices
  FOR UPDATE USING (workspace_id = 'workspace:meteoro');

DROP POLICY IF EXISTS "invoices_workspace_delete" ON crm_invoices;
CREATE POLICY "invoices_workspace_delete" ON crm_invoices
  FOR DELETE USING (workspace_id = 'workspace:meteoro');

-- ─── Trigger: updated_at automático ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_updated_at_clientes ON crm_clientes;
CREATE TRIGGER set_updated_at_clientes
  BEFORE UPDATE ON crm_clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_invoices ON crm_invoices;
CREATE TRIGGER set_updated_at_invoices
  BEFORE UPDATE ON crm_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
