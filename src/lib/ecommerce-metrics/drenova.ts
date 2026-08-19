// Lector de las métricas de Drenova vía RPC de solo lectura (Supabase propio del cliente).
// Usa el anon key público — no hace falta service_role: las 3 funciones son
// SECURITY DEFINER de agregados, sin PII, expuestas a propósito para esto
// (ver salidas/workflows/drenova/2026-08-19-rpc-metricas-portal.sql).

import { createClient } from "@supabase/supabase-js";
import type { MetricasCarritosDia, MetricasEnviosDia, MetricasMensajesDia, EcommerceMetricas } from "@/types/portal";

const DRENOVA_URL = "https://oiatxfmdxehelvqcpwfr.supabase.co";
// Anon key: es pública por diseño (Supabase la expone al browser en cualquier
// app). Segura de hardcodear porque RLS deny-all + solo 3 RPC de agregados
// están otorgadas a este rol (ver 2026-08-19-rpc-metricas-portal.sql).
const DRENOVA_ANON_KEY =
  process.env.DRENOVA_SUPABASE_ANON_KEY ||
  "sb_publishable_A7SdUGqjZ7w84lXs0a5e6A_vbloCmax";

function drenovaClient() {
  return createClient(DRENOVA_URL, DRENOVA_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getDrenovaMetricas(dias = 30): Promise<EcommerceMetricas> {
  const supabase = drenovaClient();

  const [carritosRes, enviosRes, mensajesRes] = await Promise.all([
    supabase.rpc("fn_metricas_carritos", { p_dias: dias }),
    supabase.rpc("fn_metricas_envios", { p_dias: dias }),
    supabase.rpc("fn_metricas_mensajes", { p_dias: dias }),
  ]);

  if (carritosRes.error) throw carritosRes.error;
  if (enviosRes.error) throw enviosRes.error;
  if (mensajesRes.error) throw mensajesRes.error;

  return {
    carritos: (carritosRes.data ?? []) as MetricasCarritosDia[],
    envios: (enviosRes.data ?? []) as MetricasEnviosDia[],
    mensajes: (mensajesRes.data ?? []) as MetricasMensajesDia[],
  };
}
