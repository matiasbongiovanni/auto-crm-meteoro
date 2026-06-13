import type { Invoice } from "@/types/crm";

// Cobranzas: clasificación de cartera por antigüedad (aging) y próxima acción.
// Una factura "abierta" es la que aún no se cobró: status pendiente o vencida.

export type AgingBucket = "corriente" | "b0_7" | "b8_30" | "b30plus";

export type AgingResult = {
  corriente: number; // por vencer (fecha_vencimiento en el futuro)
  b0_7: number; // vencida 1-7 días
  b8_30: number; // vencida 8-30 días
  b30plus: number; // vencida 31+ días
  total: number;
};

function diasDeMora(invoice: Invoice, hoy: Date): number {
  if (!invoice.fecha_vencimiento) return 0;
  const venc = new Date(invoice.fecha_vencimiento);
  return Math.floor((hoy.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
}

export function isAbierta(invoice: Invoice): boolean {
  return invoice.status === "pendiente" || invoice.status === "vencida";
}

export function bucketDe(invoice: Invoice, hoy: Date = new Date()): AgingBucket {
  const mora = diasDeMora(invoice, hoy);
  if (mora <= 0) return "corriente";
  if (mora <= 7) return "b0_7";
  if (mora <= 30) return "b8_30";
  return "b30plus";
}

export function agingBuckets(invoices: Invoice[], hoy: Date = new Date()): AgingResult {
  const res: AgingResult = { corriente: 0, b0_7: 0, b8_30: 0, b30plus: 0, total: 0 };
  for (const inv of invoices) {
    if (!isAbierta(inv)) continue;
    const bucket = bucketDe(inv, hoy);
    res[bucket] += inv.monto_usd;
    res.total += inv.monto_usd;
  }
  return res;
}

// Facturas abiertas ordenadas por urgencia (más mora primero), con días de mora.
export function carteraAbierta(
  invoices: Invoice[],
  hoy: Date = new Date(),
): Array<{ invoice: Invoice; mora: number; bucket: AgingBucket }> {
  return invoices
    .filter(isAbierta)
    .map((invoice) => ({ invoice, mora: diasDeMora(invoice, hoy), bucket: bucketDe(invoice, hoy) }))
    .sort((a, b) => b.mora - a.mora);
}

export function proximaAccion(mora: number): string {
  if (mora <= 0) return "Al día";
  if (mora <= 7) return "Recordatorio amable";
  if (mora <= 30) return "Segundo aviso";
  return "Llamado de cobranza";
}
