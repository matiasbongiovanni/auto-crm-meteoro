import { NextRequest, NextResponse } from "next/server";
import { hashApiKey } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/server-supabase";

export const runtime = "nodejs";

async function authenticate(request: NextRequest): Promise<boolean> {
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!key.startsWith("met_live_")) return false;
  const admin = getSupabaseServerClient();
  const { data } = await admin.from("crm_api_keys").select("id,revoked_at").eq("key_hash", hashApiKey(key)).maybeSingle();
  return !!(data && !data.revoked_at);
}

export async function GET(request: NextRequest) {
  const ok = await authenticate(request);
  if (!ok) return new NextResponse("Unauthorized", { status: 401 });

  const base = new URL(request.url).origin;
  const dataRes = await fetch(`${base}/api/widget?key=${new URL(request.url).searchParams.get("key")}`);
  const data = await dataRes.json() as {
    ok: boolean; month: string; updatedAt: string;
    metrics: { presupuestadoMes: number; cantPresupuestosMes: number; cobradoMes: number; netoMes: number; ticketPromedio: number; pendientesMes: number; cantPendientesMes: number };
    presupuestosByEstado: Record<string, number>;
  };

  const m = data.metrics;
  const mn = new Date(data.month + "-15").toLocaleString("es-AR", { month: "long", year: "numeric" });
  const time = new Date(data.updatedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  function fmtUsd(n: number) {
    if (!n && n !== 0) return "--";
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
    return `$${Math.round(n)}`;
  }

  const topCols = [
    { label: "Cobrado mes", value: fmtUsd(m.cobradoMes), sub: "ingresos", color: "#22c55e" },
    { label: "Neto mes", value: fmtUsd(m.netoMes), sub: "ing-egr", color: m.netoMes >= 0 ? "#22c55e" : "#ef4444" },
    { label: "Ticket prom.", value: fmtUsd(m.ticketPromedio), sub: "por cliente", color: "#a3a3a3" },
  ];
  const botCols = [
    { label: "Presup. total", value: fmtUsd((m as any).presupuestadoTotal ?? m.presupuestadoMes), sub: `${(m as any).cantPresupuestosTotal ?? m.cantPresupuestosMes} docs`, color: "#a3a3a3" },
    { label: "Pendiente total", value: fmtUsd((m as any).pendientesTotal ?? m.pendientesMes), sub: `${m.cantPendientesMes} este mes`, color: (m as any).pendientesTotal > 0 ? "#f59e0b" : "#22c55e" },
  ];

  const estChips = [
    { key: "enviado", label: "env", color: "#a3a3a3" },
    { key: "en_negociacion", label: "neg", color: "#f59e0b" },
    { key: "aceptado", label: "ok", color: "#22c55e" },
    { key: "rechazado", label: "rej", color: "#ef4444" },
  ];

  const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #1a1a1a; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: -apple-system, sans-serif; padding: 20px; }
  .widget {
    background: #0a0a0a;
    border-radius: 22px;
    padding: 13px 15px 11px 15px;
    width: 338px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; }
  .logo { height: 19px; opacity: 0.9; }
  .date-pill { background: #111; border-radius: 5px; padding: 3px 7px; font-size: 8px; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.05em; }
  .row { display: flex; align-items: stretch; }
  .metric { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .metric-label { font-size: 7px; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
  .metric-value { font-size: 16px; font-weight: 700; letter-spacing: -0.02em; line-height: 1; margin-bottom: 2px; }
  .metric-sub { font-size: 8px; color: #555; }
  .divider-v { width: 1px; background: #1f1f1f; align-self: stretch; margin: 0 8px; flex-shrink: 0; }
  .divider-h { height: 1px; background: #1a1a1a; margin: 7px 0; }
  .footer { display: flex; align-items: center; justify-content: space-between; margin-top: 7px; }
  .chips { display: flex; gap: 4px; }
  .chip { background: #111; border-radius: 4px; padding: 2px 5px; font-size: 8px; font-weight: 600; }
  .ts { font-size: 7px; color: #444; }
</style>
</head>
<body>
<div class="widget">
  <div class="header">
    <img class="logo" src="/brand/meteoro-negativo.png" onerror="this.style.display='none';document.getElementById('lt').style.display='block'">
    <span id="lt" style="display:none;color:#fafafa;font-size:13px;font-weight:700">METEORO</span>
    <div class="date-pill">${mn}</div>
  </div>
  <div class="row">
    ${topCols.map((c, i) => `
      ${i > 0 ? '<div class="divider-v"></div>' : ''}
      <div class="metric">
        <div class="metric-label">${c.label}</div>
        <div class="metric-value" style="color:${c.color}">${c.value}</div>
        <div class="metric-sub">${c.sub}</div>
      </div>
    `).join('')}
  </div>
  <div class="divider-h"></div>
  <div class="row">
    ${botCols.map((c, i) => `
      ${i > 0 ? '<div class="divider-v"></div>' : ''}
      <div class="metric">
        <div class="metric-label">${c.label}</div>
        <div class="metric-value" style="color:${c.color}">${c.value}</div>
        <div class="metric-sub">${c.sub}</div>
      </div>
    `).join('')}
  </div>
  <div class="footer">
    <div class="chips">
      ${estChips.map(e => `<div class="chip" style="color:${e.color}">${e.label} ${data.presupuestosByEstado[e.key] || 0}</div>`).join('')}
    </div>
    <div class="ts">act. ${time}</div>
  </div>
</div>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
