import type { PipelineCard, PipelineStage } from "@/types/crm";
import type { Subscription } from "@/types/crm";
import { monthlySubscriptionCost } from "@/lib/finance";

// Forecast de caja: convierte el pipeline en una proyección ponderada por la
// probabilidad de cierre de cada etapa, y suma las suscripciones esperadas del mes.

export const STAGE_PROBABILITY: Record<PipelineStage, number> = {
  lead: 0.1,
  contacted: 0.3,
  in_progress: 0.6,
  closed: 1,
  recalentar: 0.05,
};

export function pipelinePonderado(pipeline: PipelineCard[]): number {
  return pipeline.reduce(
    (acc, card) => acc + (card.value_usd || 0) * (STAGE_PROBABILITY[card.stage] ?? 0),
    0,
  );
}

export function pipelineCrudo(pipeline: PipelineCard[]): number {
  return pipeline.reduce((acc, card) => acc + (card.value_usd || 0), 0);
}

// Caja esperada del mes: suscripciones recurrentes + pipeline ponderado.
export function forecastMes(
  pipeline: PipelineCard[],
  subscriptions: Subscription[],
  targetMonth: string,
): number {
  return monthlySubscriptionCost(subscriptions, targetMonth) + pipelinePonderado(pipeline);
}

// Gap contra la meta del mes dado lo ya cobrado.
export function gapVsMeta(cobrado: number, meta: number): number {
  return Math.max(0, meta - cobrado);
}
