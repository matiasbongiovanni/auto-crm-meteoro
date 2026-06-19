import type { Cliente, Lead, Invoice } from "@/types/crm";
import { cleanPhoneForWhatsApp, formatUsd } from "@/lib/constants";

// Acciones 1-click vía WhatsApp (wa.me). Pre-arma mensajes en rioplatense.
// No envía: abre WhatsApp con el texto cargado para que Mati revise y mande.

export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  const clean = cleanPhoneForWhatsApp(phone);
  if (!clean) return null;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

// Busca el teléfono de un cliente/lead por nombre o empresa (case-insensitive).
export function findTelefono(
  nombre: string,
  { clientes, leads }: { clientes: Cliente[]; leads: Lead[] },
): string | null {
  const target = nombre.trim().toLowerCase();
  if (!target) return null;
  const match = (v?: string) => (v || "").trim().toLowerCase() === target;

  const cliente = clientes.find((c) => match(c.nombre) || match(c.empresa) || match(c.contacto));
  if (cliente?.telefono) return cliente.telefono;

  const lead = leads.find((l) => match(l.nombre) || match(l.empresa));
  if (lead?.telefono) return lead.telefono;

  return null;
}

function primerNombre(nombre: string): string {
  return (nombre || "").trim().split(/\s+/)[0] || "";
}

// ─── Plantillas rioplatenses ────────────────────────────────────────────────

export function msgCobro(cliente: string, invoice: Invoice, mora: number): string {
  const hola = primerNombre(cliente) ? `Hola ${primerNombre(cliente)}` : "Hola";
  const monto = formatUsd(invoice.monto_usd);
  const concepto = invoice.concepto ? ` correspondiente a ${invoice.concepto}` : "";
  const cuerpo =
    mora <= 7
      ? `te paso a recordar que quedó pendiente el pago de ${monto}${concepto}. Cuando puedas lo coordinamos 🙌`
      : `quería ver cómo seguimos con el pago de ${monto}${concepto} que está pendiente hace ${mora} días. ¿Lo podemos cerrar esta semana?`;
  return `${hola}, ¿cómo va? ${cuerpo}\n\nGracias!\nMeteoro`;
}

export function msgSeguimientoPropuesta(cliente: string, concepto: string): string {
  const hola = primerNombre(cliente) ? `Hola ${primerNombre(cliente)}` : "Hola";
  const ref = concepto ? ` sobre ${concepto}` : "";
  return `${hola}, ¿cómo andás? Te escribo para hacer un seguimiento de la propuesta que te pasé${ref}. ¿Pudiste verla? Cualquier duda la charlamos por acá 👌\n\nSaludos,\nMeteoro`;
}

export function msgRenovacion(cliente: string, dias: number): string {
  const hola = primerNombre(cliente) ? `Hola ${primerNombre(cliente)}` : "Hola";
  const cuando = dias <= 0 ? "hoy" : `en ${dias} día${dias === 1 ? "" : "s"}`;
  return `${hola}, ¿cómo va? Te aviso que tu servicio con nosotros renueva ${cuando}. Si está todo ok seguimos como hasta ahora; cualquier cambio me decís 🙌\n\nGracias por confiar en Meteoro!`;
}
