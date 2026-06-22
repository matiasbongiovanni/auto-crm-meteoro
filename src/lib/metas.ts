import type { CrmState, Meta, MetaUnidad } from "@/types/crm";
import { totalCobrado } from "@/lib/clientes";
import { formatUsd } from "@/lib/constants";

/** Metas sugeridas del mes (seed cuando no hay nada configurado). */
export const DEFAULT_METAS: Meta[] = [
  {
    id: "meta-cash-collect",
    label: "Cash collect",
    tipo: "cash_collect",
    target: 2000,
    unidad: "usd",
  },
  {
    id: "meta-ventas-servicio",
    label: "Ventas de servicios",
    tipo: "ventas_servicio",
    target: 5,
    unidad: "cantidad",
  },
  {
    id: "meta-anti-baneo",
    label: "Anti-baneo Meta",
    tipo: "ventas_producto",
    target: 5,
    unidad: "cantidad",
    productoMatch: "anti",
    subtitulo: "USD 125 setup + USD 30/mes",
  },
];

/** Clientes dados de alta dentro del mes (YYYY-MM). */
function clientesNuevosDelMes(state: CrmState, month: string) {
  return state.clientes.filter((c) => (c.fecha_alta || "").slice(0, 7) === month);
}

/**
 * Calcula el progreso de una meta contra el estado real del CRM.
 * `month` en formato YYYY-MM.
 */
export function progresoMeta(
  meta: Meta,
  state: CrmState,
  month: string,
): { actual: number; pct: number } {
  let actual = 0;

  switch (meta.tipo) {
    case "cash_collect":
      actual = totalCobrado(state.invoices, month);
      break;
    case "ventas_servicio":
      actual = clientesNuevosDelMes(state, month).length;
      break;
    case "ventas_producto": {
      const match = (meta.productoMatch || "").toLowerCase().trim();
      actual = clientesNuevosDelMes(state, month).filter((c) =>
        match ? (c.producto || "").toLowerCase().includes(match) : true,
      ).length;
      break;
    }
    case "custom":
      actual = meta.manual ?? 0;
      break;
  }

  const pct = meta.target > 0 ? Math.min((actual / meta.target) * 100, 100) : 0;
  return { actual, pct };
}

/** Formatea un valor de meta según su unidad. */
export function formatMetaValor(valor: number, unidad: MetaUnidad): string {
  if (unidad === "usd") return formatUsd(valor);
  return valor.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
