import type { Invoice } from "@/types/crm";
import { LOGO_DATA_URI } from "./logo";

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function fmtUsd(n: number): string {
  return "USD " + Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

interface FacturaParams {
  invoice: Invoice;
  clienteNombre: string;
}

export function renderFactura({ invoice, clienteNombre }: FacturaParams): string {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Factura ${esc(invoice.period_month)} - ${esc(clienteNombre)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #111; display: flex; justify-content: center; align-items: flex-start; padding: 32px 16px; font-family: 'Inter', sans-serif; }
  .doc { width: 794px; min-height: 1123px; background: #fff; color: #000; box-shadow: 0 8px 40px rgba(0,0,0,.5); display: flex; flex-direction: column; }
  .doc-header { background: #000; padding: 26px 48px; display: flex; align-items: center; justify-content: space-between; }
  .doc-header img { height: 42px; }
  .doc-header-right { text-align: right; }
  .doc-header-right .dh-label { font-size: 10px; color: #888; letter-spacing: .14em; text-transform: uppercase; font-weight: 500; }
  .doc-header-right .dh-value { font-size: 13px; color: #fff; font-weight: 600; margin-top: 2px; }
  .doc-body { flex: 1; padding: 40px 48px; }
  .doc-title { font-size: 24px; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 6px; }
  .doc-subtitle { font-size: 13px; color: #555; margin-bottom: 32px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .meta-block .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: .1em; font-weight: 500; margin-bottom: 4px; }
  .meta-block .value { font-size: 14px; font-weight: 600; color: #000; }
  .meta-block .value.muted { font-weight: 400; color: #333; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead tr { border-bottom: 2px solid #000; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; font-weight: 600; color: #555; padding: 8px 0; text-align: left; }
  th:last-child { text-align: right; }
  tbody tr { border-bottom: 1px solid #eee; }
  td { padding: 12px 0; font-size: 14px; }
  td:last-child { text-align: right; font-weight: 600; }
  .total-row { border-top: 2px solid #000; border-bottom: none; }
  .total-row td { padding-top: 16px; font-size: 18px; font-weight: 700; }
  .status-badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; background: #f5f5f5; color: #555; }
  .status-pagada { background: #dcfce7; color: #16a34a; }
  .status-vencida { background: #fee2e2; color: #dc2626; }
  .status-pendiente { background: #f5f5f5; color: #555; }
  .doc-footer { padding: 24px 48px; border-top: 1px solid #eee; font-size: 11px; color: #999; display: flex; justify-content: space-between; }
  @media print { body { background: #fff; padding: 0; } .doc { box-shadow: none; min-height: auto; } }
</style>
</head>
<body>
<div class="doc">
  <div class="doc-header">
    <img src="${LOGO_DATA_URI}" alt="Meteoro" />
    <div class="doc-header-right">
      <div class="dh-label">Factura</div>
      <div class="dh-value">${esc(invoice.period_month)}</div>
    </div>
  </div>
  <div class="doc-body">
    <div class="doc-title">Factura de Servicio</div>
    <div class="doc-subtitle">Meteoro Agencia · Córdoba, Argentina</div>

    <div class="meta-grid">
      <div class="meta-block">
        <div class="label">Cliente</div>
        <div class="value">${esc(clienteNombre)}</div>
      </div>
      <div class="meta-block">
        <div class="label">Estado</div>
        <div class="value">
          <span class="status-badge status-${esc(invoice.status)}">${esc(invoice.status)}</span>
        </div>
      </div>
      <div class="meta-block">
        <div class="label">Fecha de emisión</div>
        <div class="value muted">${esc(fmtDate(invoice.fecha_emision))}</div>
      </div>
      <div class="meta-block">
        <div class="label">Fecha de vencimiento</div>
        <div class="value muted">${esc(fmtDate(invoice.fecha_vencimiento))}</div>
      </div>
      ${invoice.fecha_pago ? `
      <div class="meta-block">
        <div class="label">Fecha de pago</div>
        <div class="value muted">${esc(fmtDate(invoice.fecha_pago))}</div>
      </div>` : ""}
    </div>

    <table>
      <thead>
        <tr>
          <th>Concepto</th>
          <th>Período</th>
          <th>Monto</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${esc(invoice.concepto)}</td>
          <td>${esc(invoice.period_month)}</td>
          <td>${esc(fmtUsd(invoice.monto_usd))}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="2">Total</td>
          <td>${esc(fmtUsd(invoice.monto_usd))}</td>
        </tr>
      </tfoot>
    </table>

    ${invoice.notas ? `<p style="font-size:13px;color:#555;margin-top:16px;"><strong>Notas:</strong> ${esc(invoice.notas)}</p>` : ""}
  </div>
  <div class="doc-footer">
    <span>Meteoro Agencia — Córdoba, Argentina</span>
    <span>meteoro.com.ar</span>
  </div>
</div>
</body>
</html>`;
  return html;
}
