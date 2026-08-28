// Lector de las métricas de UroBalance vía RPC de solo lectura (Supabase
// propio del cliente, self-hosted). Mismo patrón que Drenova (ver
// salidas/workflows/urobalance/2026-08-24-metricas-portal-housekeeping.sql):
// vistas v_metricas_carritos/v_metricas_mensajes con atribución real
// (recuperado_por_campana) + 2 RPC SECURITY DEFINER otorgadas a anon.
// Reemplaza el webhook n8n "UroBalance · Métricas Portal (Meteoro)"
// (3wqswNsRAEWlXl4m), que le pegaba a las tablas con httpRequest ad-hoc.

import { createClient } from "@supabase/supabase-js";
import type { MetricasCarritosDia, MetricasMensajesDia, EcommerceMetricas } from "@/types/portal";

const UROBALANCE_URL = "https://urobalance-supabase.meteoro.com.ar";
// Anon key: es pública por diseño (Supabase la expone al browser en cualquier
// app). Segura de hardcodear porque RLS deny-all + solo 2 RPC de agregados
// (sin PII) están otorgadas a este rol.
const UROBALANCE_ANON_KEY =
  process.env.UROBALANCE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLXVyb2JhbGFuY2UiLCJpYXQiOjE3ODcyMDM2NjksImV4cCI6MjEwMjU2MzY2OX0.fMQPtBb54Ih64Ii-Y5ZO_d8nuc7JNq6kIG7O2rS6gsA";

function urobalanceClient() {
  return createClient(UROBALANCE_URL, UROBALANCE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getUrobalanceMetricas(dias = 30): Promise<EcommerceMetricas> {
  const supabase = urobalanceClient();

  const [carritosRes, mensajesRes] = await Promise.all([
    supabase.rpc("fn_metricas_carritos", { p_dias: dias }),
    supabase.rpc("fn_metricas_mensajes", { p_dias: dias }),
  ]);

  if (carritosRes.error) throw carritosRes.error;
  if (mensajesRes.error) throw mensajesRes.error;

  return {
    carritos: (carritosRes.data ?? []) as MetricasCarritosDia[],
    envios: [],
    mensajes: (mensajesRes.data ?? []) as MetricasMensajesDia[],
  };
}
