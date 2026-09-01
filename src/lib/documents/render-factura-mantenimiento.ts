import { LOGO_NUEVO_DATA_URI } from "./logo-nuevo";
import { WALLET_QR_TRX_DATA_URI } from "./wallet-qr";

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

export interface FacturaMantenimientoData {
  cliente: string;
  servicio: string;
  mes: string;
  valorUsd: number;
  fechaEmision: string;
}

export function renderFacturaMantenimiento({ cliente, servicio, mes, valorUsd, fechaEmision }: FacturaMantenimientoData): string {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Factura - ${esc(cliente)}</title>
<style>
  @page { size: A4; margin: 0; }
  html,body { height: auto; }
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #08080a; color: #fff; font-family: 'Inter', sans-serif; display: flex; justify-content: center; padding: 0; }
  .doc { width: 794px; height: 1123px; overflow: hidden; background: #08080a; position: relative; display: flex; flex-direction: column; }
  .glow { position: absolute; top: -260px; left: 50%; transform: translateX(-50%); width: 900px; height: 900px; border-radius: 50%; background: radial-gradient(circle, #ffffff 0%, transparent 70%); opacity: .08; filter: blur(140px); pointer-events: none; }
  .topbar { height: 2px; width: 100%; background: rgba(255,255,255,.06); }
  .topbar-fill { height: 100%; width: 100%; background: #fff; box-shadow: 0 0 12px rgba(255,255,255,.5); }
  header { position: relative; z-index: 1; padding: 36px 56px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,.06); }
  header img { height: 56px; width: auto; object-fit: contain; }
  .hdr-right { text-align: right; }
  .hdr-label { font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: rgba(255,255,255,.3); font-weight: 600; }
  .hdr-value { font-size: 14px; font-weight: 700; margin-top: 4px; }
  main { position: relative; z-index: 1; flex: 1; padding: 44px 56px; }
  .eyebrow { font-size: 10px; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(255,255,255,.3); margin-bottom: 12px; }
  h1 { font-size: 38px; font-weight: 800; letter-spacing: -.02em; margin-bottom: 6px; }
  .sub { font-size: 13px; color: rgba(255,255,255,.4); margin-bottom: 28px; }
  .card { border-radius: 16px; background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.08); padding: 26px 32px; margin-bottom: 20px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
  .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: .18em; color: rgba(255,255,255,.3); margin-bottom: 6px; font-weight: 600; }
  .meta-value { font-size: 15px; font-weight: 700; color: #fff; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { border-bottom: 2px solid rgba(255,255,255,.15); }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: .12em; font-weight: 600; color: rgba(255,255,255,.4); padding: 10px 0; text-align: left; }
  th:last-child { text-align: right; }
  tbody tr { border-bottom: 1px solid rgba(255,255,255,.06); }
  td { padding: 16px 0; font-size: 14px; color: rgba(255,255,255,.85); }
  td:last-child { text-align: right; font-weight: 700; color: #fff; }
  .total-row td { padding-top: 20px; font-size: 20px; font-weight: 800; border-top: 2px solid rgba(255,255,255,.15); }
  .total-row td:first-child { color: rgba(255,255,255,.5); font-size: 11px; text-transform: uppercase; letter-spacing: .12em; font-weight: 600; }
  .status-badge { display: inline-block; padding: 5px 12px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; background: rgba(52,211,153,.12); color: #34d399; border: 1px solid rgba(52,211,153,.25); }
  .pago-row { display: flex; align-items: center; gap: 22px; }
  .pago-qr { width: 96px; height: 96px; border-radius: 10px; background: #fff; padding: 6px; flex-shrink: 0; }
  .pago-qr img { width: 100%; height: 100%; object-fit: contain; }
  .pago-info { flex: 1; }
  .pago-label { font-size: 9px; text-transform: uppercase; letter-spacing: .18em; color: rgba(255,255,255,.3); margin-bottom: 8px; font-weight: 600; }
  .pago-wallet-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .pago-wallet { font-family: "SFMono-Regular", Consolas, monospace; font-size: 13px; color: #fff; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 8px; padding: 8px 12px; letter-spacing: .01em; }
  .pago-red { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: .1em; background: rgba(255,255,255,.05); border-radius: 999px; padding: 4px 10px; }
  .signature { margin-top: 32px; display: flex; justify-content: flex-end; }
  .sig-block { text-align: right; }
  .sig-line { width: 240px; border-top: 1px solid rgba(255,255,255,.25); padding-top: 10px; margin-left: auto; }
  .sig-name { font-size: 14px; font-weight: 700; color: #fff; }
  .sig-role { font-size: 10px; color: rgba(255,255,255,.35); text-transform: uppercase; letter-spacing: .12em; margin-top: 3px; }
  footer { position: relative; z-index: 1; padding: 26px 56px; border-top: 1px solid rgba(255,255,255,.06); display: flex; justify-content: space-between; align-items: center; }
  footer img { height: 22px; width: auto; object-fit: contain; opacity: .4; }
  .foot-note { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.2); }
</style>
</head>
<body>
<div class="doc">
  <div class="glow"></div>
  <div class="topbar"><div class="topbar-fill"></div></div>
  <header>
    <img src="${LOGO_NUEVO_DATA_URI}" alt="meteoro." />
    <div class="hdr-right">
      <div class="hdr-label">Factura</div>
      <div class="hdr-value">${esc(mes)}</div>
    </div>
  </header>

  <main>
    <div class="eyebrow">Servicio de mantenimiento</div>
    <h1>${esc(cliente)}</h1>
    <div class="sub">Meteoro Agencia · Córdoba, Argentina</div>

    <div class="card">
      <div class="meta-grid">
        <div>
          <div class="meta-label">Cliente</div>
          <div class="meta-value">${esc(cliente)}</div>
        </div>
        <div>
          <div class="meta-label">Estado</div>
          <div class="meta-value"><span class="status-badge">Pendiente</span></div>
        </div>
        <div>
          <div class="meta-label">Fecha de emisión</div>
          <div class="meta-value">${esc(fmtDate(fechaEmision))}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr><th>Concepto</th><th>Período</th><th>Monto</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>${esc(servicio)}</td>
            <td>${esc(mes)}</td>
            <td>${esc(fmtUsd(valorUsd))}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="total-row"><td>Total</td><td></td><td>${esc(fmtUsd(valorUsd))}</td></tr>
        </tfoot>
      </table>
    </div>

    <div class="card">
      <div class="pago-row">
        <div class="pago-qr"><img src="${WALLET_QR_TRX_DATA_URI}" alt="QR wallet" /></div>
        <div class="pago-info">
          <div class="pago-label">Método de pago</div>
          <div class="pago-wallet-row">
            <span class="pago-wallet">TGh6ktczYJJk43uGnnWU22wuk9zKLWc6gU</span>
            <span class="pago-red">Red: TRX</span>
          </div>
        </div>
      </div>
    </div>

    <div class="signature">
      <div class="sig-block">
        <div class="sig-line">
          <div class="sig-name">Meteoro Agencia</div>
          <div class="sig-role">Matías Bongiovanni Weschta · Fundador</div>
        </div>
      </div>
    </div>
  </main>

  <footer>
    <img src="${LOGO_NUEVO_DATA_URI}" alt="meteoro." />
    <span class="foot-note">meteoro.com.ar</span>
  </footer>
</div>
</body>
</html>`;
  return html;
}
