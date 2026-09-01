import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, requireScope } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/server-supabase";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import type { Cliente } from "@/types/crm";

export const runtime = "nodejs";

const REMINDER_COOLDOWN_DAYS = 7;

type InvoiceWithCliente = {
  id: string;
  cliente_id: string;
  concepto: string;
  period_month: string;
  monto_usd: number;
  status: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  wa_recordatorio_enviado_at: string | null;
  cliente: { nombre: string; empresa: string | null; telefono: string | null } | null;
};

// ─── Generar facturas del mes ────────────────────────────────────────────
// Mismo criterio que la acción "generate-monthly-invoices" de /clientes:
// clientes activos con billing_cycle=mensual sin factura ese period_month.
async function generateInvoices(admin: ReturnType<typeof getSupabaseServerClient>, periodMonth: string) {
  const [y, m] = periodMonth.split("-").map(Number);
  const vencimiento = new Date(y, m, 10).toISOString().slice(0, 10);

  const { data: clientes, error: clientesErr } = await admin
    .from("crm_clientes")
    .select("*")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("status", "activo");
  if (clientesErr) throw new Error(clientesErr.message);

  const { data: existing, error: existingErr } = await admin
    .from("crm_invoices")
    .select("cliente_id")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("period_month", periodMonth);
  if (existingErr) throw new Error(existingErr.message);

  const existingIds = new Set((existing || []).map((i: { cliente_id: string }) => i.cliente_id));
  const now = new Date().toISOString();
  const toCreate = (clientes || []).filter((c: Cliente) => c.billing_cycle === "mensual" && !existingIds.has(c.id));
  if (toCreate.length === 0) return [];

  const rows = toCreate.map((c: Cliente) => ({
    id: crypto.randomUUID(),
    workspace_id: DEFAULT_WORKSPACE_ID,
    cliente_id: c.id,
    concepto: `Mensualidad ${periodMonth} - ${c.producto || c.nombre}`,
    period_month: periodMonth,
    monto_usd: c.fee_usd,
    status: "pendiente",
    fecha_emision: now.slice(0, 10),
    fecha_vencimiento: vencimiento,
    created_at: now,
    updated_at: now,
  }));

  const { error: insertErr } = await admin.from("crm_invoices").insert(rows);
  if (insertErr) throw new Error(insertErr.message);

  return rows.map((r) => {
    const cliente = toCreate.find((c: Cliente) => c.id === r.cliente_id) as Cliente;
    return {
      invoice_id: r.id,
      cliente_id: r.cliente_id,
      nombre: cliente.nombre,
      empresa: cliente.empresa,
      telefono: cliente.telefono,
      concepto: r.concepto,
      monto_usd: r.monto_usd,
      period_month: r.period_month,
      fecha_vencimiento: r.fecha_vencimiento,
    };
  });
}

export async function POST(request: NextRequest) {
  const ctx = await authenticateApiKey(request);
  const guard = requireScope(ctx, "write");
  if (guard) return guard;

  if (!rateLimit(`n8n-facturacion:${ctx!.keyId}`, { limit: 20, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Rate limit excedido." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const admin = getSupabaseServerClient();

  if (body.action === "generar-facturas") {
    const periodMonth = String(body.period_month || new Date().toISOString().slice(0, 7));
    try {
      const created = await generateInvoices(admin, periodMonth);
      return NextResponse.json({ ok: true, created: created.length, facturas: created });
    } catch (err) {
      return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
    }
  }

  if (body.action === "marcar-enviada") {
    const invoiceId = String(body.invoice_id || "");
    const tipo = body.tipo === "recordatorio" ? "wa_recordatorio_enviado_at" : "wa_factura_enviada_at";
    if (!invoiceId) return NextResponse.json({ ok: false, error: "invoice_id requerido." }, { status: 400 });
    const { error } = await admin
      .from("crm_invoices")
      .update({ [tipo]: new Date().toISOString() })
      .eq("id", invoiceId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: `Acción desconocida: ${body.action}` }, { status: 400 });
}

// ─── Facturas vencidas que necesitan recordatorio ───────────────────────
export async function GET(request: NextRequest) {
  const ctx = await authenticateApiKey(request);
  const guard = requireScope(ctx, "read");
  if (guard) return guard;

  const action = request.nextUrl.searchParams.get("action");
  if (action !== "pendientes-recordatorio") {
    return NextResponse.json({ ok: false, error: `Acción desconocida: ${action}` }, { status: 400 });
  }

  const admin = getSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);

  // Cualquier factura vencida y no pagada. Vencer automáticamente las que
  // seguían "pendiente" con fecha_vencimiento pasada.
  await admin
    .from("crm_invoices")
    .update({ status: "vencida", updated_at: new Date().toISOString() })
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("status", "pendiente")
    .lt("fecha_vencimiento", today);

  const { data, error } = await admin
    .from("crm_invoices")
    .select("id,cliente_id,concepto,period_month,monto_usd,status,fecha_emision,fecha_vencimiento,wa_recordatorio_enviado_at,cliente:crm_clientes(nombre,empresa,telefono)")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("status", "vencida");

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const cooldownMs = REMINDER_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const rows = (data || []) as unknown as InvoiceWithCliente[];
  const pendientes = rows
    .filter((r) => !r.wa_recordatorio_enviado_at || now - new Date(r.wa_recordatorio_enviado_at).getTime() >= cooldownMs)
    .filter((r) => r.cliente?.telefono)
    .map((r) => ({
      invoice_id: r.id,
      cliente_id: r.cliente_id,
      nombre: r.cliente!.nombre,
      empresa: r.cliente!.empresa,
      telefono: r.cliente!.telefono,
      concepto: r.concepto,
      monto_usd: r.monto_usd,
      period_month: r.period_month,
      fecha_vencimiento: r.fecha_vencimiento,
    }));

  return NextResponse.json({ ok: true, count: pendientes.length, facturas: pendientes });
}
