import type { Cliente, Invoice, ClientHealth, BillingCycle } from "@/types/crm";

export function mrrDeCliente(cliente: Cliente): number {
  const fee = cliente.fee_usd;
  switch (cliente.billing_cycle as BillingCycle) {
    case "mensual":    return fee;
    case "trimestral": return fee / 3;
    case "anual":      return fee / 12;
    case "unico":      return 0;
    default:           return fee;
  }
}

export function mrrTotal(clientes: Cliente[]): number {
  return clientes.filter((c) => c.status === "activo").reduce((sum, c) => sum + mrrDeCliente(c), 0);
}

export function diasARenovacion(cliente: Cliente, hoy: Date = new Date()): number | null {
  if (!cliente.fecha_renovacion) return null;
  const renovacion = new Date(cliente.fecha_renovacion);
  return Math.round((renovacion.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export function healthDeCliente(
  cliente: Cliente,
  invoices: Invoice[],
  ultimoContacto?: string,
  hoy: Date = new Date(),
): ClientHealth {
  const clienteInvoices = invoices.filter((i) => i.cliente_id === cliente.id);
  const tieneVencida = clienteInvoices.some((i) => i.status === "vencida");

  const diasSinContacto = ultimoContacto
    ? Math.round((hoy.getTime() - new Date(ultimoContacto).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const diasRenovacion = diasARenovacion(cliente, hoy);

  if (tieneVencida || (diasSinContacto !== null && diasSinContacto > 45)) return "riesgo";
  if (
    (diasRenovacion !== null && diasRenovacion <= 14 && diasRenovacion >= 0) ||
    (diasSinContacto !== null && diasSinContacto > 30)
  ) return "atencion";

  return "sano";
}

export function proximoPeriodo(cliente: Cliente, hoy: Date = new Date()): string {
  return hoy.toISOString().slice(0, 7);
}

export function invoicesDelMes(invoices: Invoice[], month: string): Invoice[] {
  return invoices.filter((i) => i.period_month === month);
}

export function totalCobrado(invoices: Invoice[], month: string): number {
  return invoicesDelMes(invoices, month)
    .filter((i) => i.status === "pagada")
    .reduce((sum, i) => sum + i.monto_usd, 0);
}

export function totalPorCobrar(invoices: Invoice[], month: string): number {
  return invoicesDelMes(invoices, month)
    .filter((i) => i.status === "pendiente")
    .reduce((sum, i) => sum + i.monto_usd, 0);
}

export function totalVencido(invoices: Invoice[]): number {
  return invoices
    .filter((i) => i.status === "vencida")
    .reduce((sum, i) => sum + i.monto_usd, 0);
}
