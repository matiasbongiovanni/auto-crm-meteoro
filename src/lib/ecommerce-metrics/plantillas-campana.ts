// Qué plantillas cuentan como "mensaje de recuperación de carrito" para el
// denominador de la tasa de conversión mostrada en el portal. Tiene que ser
// EXACTO al set que usa recuperado_por_campana en v_metricas_carritos de
// cada cliente (ver salidas/workflows/<cliente>/*.sql) — si se desalinean,
// numerador y denominador miden poblaciones distintas y la tasa miente.
import type { MetricasSource } from "@/types/portal";

export const PLANTILLAS_CAMPANA: Record<MetricasSource, string[]> = {
  // dre_carrito_2 (variante "beneficio") queda afuera a pedido explícito de
  // Mati (2026-08-20): solo cuentan los 2 toques reales.
  drenova_carritos: ["dre_carrito_1", "dre_carrito_3"],
  urobalance_carritos: ["uro_carrito_1", "uro_carrito_2"],
  // No aplica: PuntoShop no usa el patrón de atribución de campaña.
  puntoshop_pedidos: [],
};

export function plantillasCampanaFor(source: MetricasSource | null | undefined): string[] {
  if (!source) return [];
  return PLANTILLAS_CAMPANA[source] ?? [];
}
