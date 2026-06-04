import { NextRequest, NextResponse } from "next/server";
import { hashApiKey } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/server-supabase";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";
import type { PendingPayment } from "@/types/crm";

export const runtime = "nodejs";

const STATE_KEY_PENDING = "exp2_pending_payments";

async function authenticate(request: NextRequest): Promise<boolean> {
  const header = request.headers.get("authorization") || "";
  const keyFromHeader = header.replace(/^Bearer\s+/i, "").trim();
  const keyFromQuery = new URL(request.url).searchParams.get("key") || "";
  const raw = keyFromHeader || keyFromQuery;
  if (!raw.startsWith("met_live_")) return false;
  const admin = getSupabaseServerClient();
  const hash = hashApiKey(raw);
  const { data, error } = await admin.from("crm_api_keys").select("id, revoked_at").eq("key_hash", hash).maybeSingle();
  if (error || !data || data.revoked_at) return false;
  await admin.from("crm_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return true;
}

export async function GET(request: NextRequest) {
  const ok = await authenticate(request);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseServerClient();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const wsId = DEFAULT_WORKSPACE_ID;

  const [ingresosRes, egresosRes, stateRes, clientesRes, proposalsRes, invoicesRes] = await Promise.all([
    admin.from("crm_ingresos").select("persona, usd, period_month, fecha").eq("workspace_id", wsId),
    admin.from("crm_egresos").select("usd, period_month, fecha").eq("workspace_id", wsId),
    admin.from("crm_state").select("state_key, payload").eq("state_key", STATE_KEY_PENDING),
    admin.from("crm_clientes").select("nombre, fee_usd, status, billing_cycle").eq("workspace_id", wsId),
    admin.from("crm_proposals").select("fecha_envio, monto_usd, estado").eq("workspace_id", wsId),
    admin.from("crm_invoices").select("monto_usd, status, period_month").eq("workspace_id", wsId),
  ]);

  const ingresos = (ingresosRes.data ?? []) as { persona?: string; usd?: number; period_month?: string; fecha?: string }[];
  const egresos = (egresosRes.data ?? []) as { usd?: number; period_month?: string; fecha?: string }[];
  const pendingPayments: PendingPayment[] = ((stateRes.data?.[0]?.payload) as PendingPayment[]) ?? [];
  const clientes = (clientesRes.data ?? []) as { nombre: string; fee_usd: number; status: string; billing_cycle: string }[];
  const proposals = (proposalsRes.data ?? []) as { fecha_envio?: string; monto_usd?: number | null; estado?: string }[];
  const invoices = (invoicesRes.data ?? []) as { monto_usd: number; status: string; period_month?: string }[];

  // ── Ingresos / egresos del mes ─────────────────────────────────────────────
  const ingresosMes = ingresos.filter((r) => (r.period_month || r.fecha || "").startsWith(currentMonth));
  const cobradoMes = ingresosMes.reduce((a, r) => a + (r.usd || 0), 0);
  const egresosMes = egresos.filter((r) => (r.period_month || r.fecha || "").startsWith(currentMonth)).reduce((a, r) => a + (r.usd || 0), 0);
  const netoMes = cobradoMes - egresosMes;

  // ── Ticket promedio ────────────────────────────────────────────────────────
  const clientesMes = new Set(ingresosMes.map((r) => r.persona?.toLowerCase().trim()).filter(Boolean));
  const ticketPromedio = clientesMes.size > 0 ? cobradoMes / clientesMes.size : 0;

  // ── Proposals ─────────────────────────────────────────────────────────────
  const propsMes = proposals.filter((p) => p.fecha_envio?.startsWith(currentMonth));
  const presupuestadoMes = propsMes.reduce((a, p) => a + (p.monto_usd || 0), 0);
  const cantPresupuestosMes = propsMes.length;
  const presupuestadoTotal = proposals.reduce((a, p) => a + (p.monto_usd || 0), 0);
  const cantPresupuestosTotal = proposals.length;

  const byEstado = proposals.reduce<Record<string, number>>((acc, p) => {
    const s = p.estado || "desconocido";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  // ── Pagos pendientes mes: manuales + mensualidades auto + facturas ─────────
  const clientesConIngreso = new Set(ingresosMes.map((r) => r.persona?.toLowerCase().trim()).filter(Boolean));

  const pendingMes = pendingPayments.filter((p) => p.estado !== "cobrado" && (p.fecha_entrega || "").startsWith(currentMonth));
  const pendingMesSum = pendingMes.reduce((a, p) => a + (p.monto_usd || 0), 0);

  const clientesEnPending = new Set(pendingMes.map((p) => p.cliente.toLowerCase().trim()));
  const mensualidadesAuto = clientes
    .filter((c) => c.status === "activo" && c.billing_cycle === "mensual")
    .filter((c) => !clientesConIngreso.has(c.nombre.toLowerCase().trim()))
    .filter((c) => !clientesEnPending.has(c.nombre.toLowerCase().trim()));
  const mensualidadesSum = mensualidadesAuto.reduce((a, c) => a + (c.fee_usd || 0), 0);

  const invoicesMesPendientes = invoices.filter((i) => (i.period_month || "").startsWith(currentMonth) && (i.status === "pendiente" || i.status === "vencida"));
  const invoicesMesSum = invoicesMesPendientes.reduce((a, i) => a + (i.monto_usd || 0), 0);

  const pendientesMesTotal = pendingMesSum + mensualidadesSum + invoicesMesSum;
  const cantPendientesMes = pendingMes.length + mensualidadesAuto.length + invoicesMesPendientes.length;

  // ── Pendientes totales (todos los meses) ───────────────────────────────────
  const pendingTotalManual = pendingPayments.filter((p) => p.estado !== "cobrado").reduce((a, p) => a + (p.monto_usd || 0), 0);
  const mensualidadesTotalSum = clientes
    .filter((c) => c.status === "activo" && c.billing_cycle === "mensual")
    .filter((c) => !clientesConIngreso.has(c.nombre.toLowerCase().trim()))
    .reduce((a, c) => a + (c.fee_usd || 0), 0);
  const invoicesTotalPendientes = invoices.filter((i) => i.status === "pendiente" || i.status === "vencida").reduce((a, i) => a + (i.monto_usd || 0), 0);
  const pendientesTotal = pendingTotalManual + mensualidadesTotalSum + invoicesTotalPendientes;

  return NextResponse.json({
    ok: true,
    month: currentMonth,
    updatedAt: new Date().toISOString(),
    metrics: {
      cobradoMes, netoMes, ticketPromedio,
      presupuestadoMes, cantPresupuestosMes,
      presupuestadoTotal, cantPresupuestosTotal,
      pendientesMes: pendientesMesTotal, cantPendientesMes,
      pendientesTotal,
    },
    presupuestosByEstado: byEstado,
  });
}
