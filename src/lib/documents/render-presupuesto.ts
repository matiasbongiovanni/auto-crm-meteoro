import type { PresupuestoData } from "./types";
import { LOGO_DATA_URI } from "./logo";

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function fmt(n: number, mon: string): string {
  const sym = mon === "USD" ? "USD " : mon === "EUR" ? "€ " : "$ ";
  return sym + Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function listHtml(text: string): string {
  const lines = String(text || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return lines.length ? `<ul class="td-list">${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : "";
}

const DOC_CSS = `/* ============================================================
   DOCUMENTO
   ============================================================ */
    .doc {
      width: 794px;
      min-height: 1123px;
      background: #fff;
      color: #000;
      box-shadow: 0 8px 40px rgba(0, 0, 0, .5);
      font-family: 'Inter', sans-serif;
      display: flex;
      flex-direction: column
    }

    /* header negro */
    .doc-header {
      background: #000;
      padding: 26px 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0
    }

    .doc-header img {
      height: 42px
    }

    .doc-header-right {
      text-align: right
    }

    .doc-header-right .dh-label {
      font-size: 10px;
      color: #666;
      letter-spacing: .14em;
      text-transform: uppercase;
      font-weight: 500
    }

    .doc-header-right .dh-client {
      font-size: 15px;
      font-weight: 600;
      color: #fff;
      margin-top: 2px
    }

    /* banda título */
    .doc-title-band {
      background: #f5f5f5;
      border-bottom: 3px solid #000;
      padding: 30px 48px
    }

    .doc-cot-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: .22em;
      text-transform: uppercase;
      color: #aaa;
      margin-bottom: 6px
    }

    .doc-ptitle {
      font-family: 'Barlow Condensed', sans-serif;
      font-weight: 800;
      font-size: 38px;
      color: #000;
      line-height: 1.05;
      letter-spacing: .01em
    }

    .doc-tagline {
      font-size: 11px;
      color: #bbb;
      margin-top: 7px;
      font-style: italic;
      letter-spacing: .06em
    }

    /* meta */
    .doc-meta {
      padding: 18px 48px;
      display: flex;
      gap: 36px;
      border-bottom: 1px solid #ececec
    }

    .doc-meta-item {
      display: flex;
      flex-direction: column
    }

    .doc-meta-lbl {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: .18em;
      text-transform: uppercase;
      color: #bbb;
      margin-bottom: 3px
    }

    .doc-meta-val {
      font-size: 13px;
      font-weight: 600;
      color: #000
    }

    /* body */
    .doc-body {
      padding: 28px 48px;
      flex: 1
    }

    /* tabla */
    .doc-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0
    }

    .doc-table thead tr {
      background: #000;
      color: #fff
    }

    .doc-table thead th {
      padding: 9px 13px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: .14em;
      text-transform: uppercase;
      text-align: left
    }

    .doc-table thead th.r {
      text-align: right
    }

    .doc-table tbody tr {
      border-bottom: 1px solid #f0f0f0
    }

    .doc-table tbody tr:last-child {
      border-bottom: none
    }

    .doc-table tbody td {
      padding: 11px 13px;
      font-size: 13px;
      vertical-align: top
    }

    .doc-table tbody td.r {
      text-align: right;
      white-space: nowrap
    }

    .td-name {
      font-weight: 600
    }

    .td-desc {
      font-weight: 400;
      color: #888;
      font-size: 11px;
      margin-top: 2px
    }

    .td-list {
      margin: 5px 0 0 16px;
      padding: 0;
      font-weight: 400;
      font-size: 12px;
      color: #555;
      line-height: 1.7
    }

    .td-list li {
      margin-bottom: 1px
    }

    /* totales */
    .doc-totals {
      margin-top: 0;
      border-top: 2px solid #000;
      padding-top: 14px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 5px
    }

    .tot-row {
      display: flex;
      justify-content: space-between;
      width: 260px
    }

    .tot-row .tl {
      font-size: 12px;
      color: #999
    }

    .tot-row .tv {
      font-size: 13px;
      font-weight: 600;
      color: #000;
      text-align: right
    }

    .tot-final {
      display: flex;
      justify-content: space-between;
      width: 260px;
      background: #000;
      padding: 9px 14px;
      margin-top: 5px;
      border-radius: 3px
    }

    .tot-final .tl {
      font-size: 11px;
      color: #aaa;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase
    }

    .tot-final .tv {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      text-align: right
    }

    /* notas */
    .doc-notes {
      margin-top: 26px;
      padding-top: 18px;
      border-top: 1px solid #ececec
    }

    .doc-notes-lbl {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: .18em;
      text-transform: uppercase;
      color: #bbb;
      margin-bottom: 7px
    }

    .doc-notes-txt {
      font-size: 12px;
      color: #555;
      line-height: 1.75;
      white-space: pre-wrap
    }

    /* validez */
    .doc-validez {
      margin-top: 16px;
      font-size: 11px;
      color: #ccc;
      font-style: italic
    }

    /* footer */
    .doc-footer {
      background: #000;
      padding: 16px 48px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      flex-shrink: 0
    }

    .doc-footer-contacts {
      display: flex;
      gap: 24px
    }

    .dfc-item {
      display: flex;
      flex-direction: column
    }

    .dfc-item .dfc-lbl {
      font-size: 8px;
      color: #555;
      letter-spacing: .14em;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 2px
    }

    .dfc-item .dfc-val {
      font-size: 11px;
      color: #ccc;
      font-weight: 500
    }

    .doc-footer-logo img {
      height: 26px;
      opacity: .65
    }

    /* ============================================================
   PRINT
   ============================================================ */
    /* segunda hoja en pantalla */
    .doc + .doc {
      margin-top: 40px
    }

    /* segunda hoja siempre ocupa A4 completo */
    .doc-p2 {
      min-height: 1123px
    }

    /* título de la segunda hoja */
    .doc-page2-title {
      font-family: 'Barlow Condensed', sans-serif;
      font-weight: 800;
      font-size: 32px;
      color: #000;
      letter-spacing: .01em;
      margin-bottom: 20px
    }

    /* ============================================================
   PRINT
   ============================================================ */
    @media print {
      html, body {
        margin: 0;
        padding: 0;
        background: #fff !important
      }

      .doc {
        display: block !important;
        box-shadow: none !important;
        width: 100% !important;
        min-height: 0 !important;
        height: auto !important
      }

      .doc + .doc {
        margin-top: 0 !important;
        page-break-before: always
      }

      .doc-footer {
        margin-top: 24px !important
      }

      /* hoja 2: flex para pinear el footer al fondo del A4 */
      .doc-p2 {
        display: flex !important;
        flex-direction: column !important;
        min-height: 297mm !important;
        height: 297mm !important
      }

      .doc-p2 .doc-footer {
        margin-top: auto !important
      }

      @page {
        margin: 0;
        size: A4
      }
    }
  `;

export function renderPresupuesto(data: PresupuestoData): string {
  const mon = data.moneda;
  const sub = data.items.reduce((a, it) => a + it.cantidad * it.precio, 0);
  const iva = data.incluyeIva ? sub * 0.21 : 0;
  const total = sub + iva;
  const plansEnabled = data.includePlanes && data.planes.length > 0;

  let rows = "";
  data.items.forEach((it, i) => {
    rows += `<tr>
      <td>${i + 1}</td>
      <td class="td-name">${esc(it.nombre || `Ítem ${i + 1}`)}${it.descripcion ? `<div class="td-desc">${esc(it.descripcion)}</div>` : ""}</td>
      <td>${it.cantidad}</td>
      <td class="r">${fmt(it.precio, mon)}</td>
      <td class="r">${fmt(it.cantidad * it.precio, mon)}</td>
    </tr>`;
  });

  let tots = "";
  if (data.incluyeIva) {
    tots += `<div class="tot-row"><span class="tl">Subtotal</span><span class="tv">${fmt(sub, mon)}</span></div>
    <div class="tot-row"><span class="tl">IVA (21%)</span><span class="tv">${fmt(iva, mon)}</span></div>`;
  }
  tots += `<div class="tot-final"><span class="tl">Total</span><span class="tv">${fmt(total, mon)}</span></div>`;

  const notasHtml = data.notas
    ? `<div class="doc-notes"><div class="doc-notes-lbl">Notas y condiciones</div><div class="doc-notes-txt">${esc(data.notas)}</div></div>`
    : "";

  const plansPage = plansEnabled
    ? `<div class="doc doc-p2">
    <div class="doc-header">
      <img src="${LOGO_DATA_URI}" alt="Meteoro" style="width: 125px; height: auto;">
      <div class="doc-header-right">
        <div class="dh-label">Planes mensuales</div>
        <div class="dh-client">${esc(data.cliente) || "Cliente"}</div>
      </div>
    </div>
    <div class="doc-body">
      <div class="doc-page2-title">Planes mensuales</div>
      <table class="doc-table"><thead><tr>
        <th style="width:32px">#</th><th>Plan</th><th class="r" style="width:160px">Precio mensual</th>
      </tr></thead><tbody>${data.planes
        .map((pl, i) => `<tr>
          <td>${i + 1}</td>
          <td class="td-name">${esc(pl.nombre || `Plan ${i + 1}`)}${listHtml(pl.descripcion)}</td>
          <td class="r">${fmt(pl.precio, mon)}</td>
        </tr>`).join("")}</tbody></table>
    </div>
    <div class="doc-footer">
      <div class="doc-footer-contacts">
        <div class="dfc-item"><span class="dfc-lbl">Email</span><span class="dfc-val">${esc(data.footer.email)}</span></div>
        <div class="dfc-item"><span class="dfc-lbl">Teléfono</span><span class="dfc-val">${esc(data.footer.telefono)}</span></div>
        <div class="dfc-item"><span class="dfc-lbl">Instagram</span><span class="dfc-val">${esc(data.footer.instagram)}</span></div>
      </div>
      <img src="${LOGO_DATA_URI}" alt="Meteoro" style="width: 75px; height: auto;">
    </div>
  </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cotización ${esc(data.numero)} — ${esc(data.cliente)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>${DOC_CSS}</style>
</head>
<body>
<div class="doc" id="doc">
   <div class="doc-header">
  <img src="${LOGO_DATA_URI}" alt="Meteoro" style="width: 125px; height: auto;">
  <div class="doc-header-right">
    <div class="dh-label">${esc(data.proyecto) || "Cotización"}</div>
    <div class="dh-client">${esc(data.cliente) || "Cliente"}</div>
  </div>
</div>

    <div class="doc-title-band">
      <div class="doc-cot-label">Cotización &middot; N° ${esc(data.numero)}</div>
      <div class="doc-ptitle">${esc(data.proyecto) || "Propuesta de servicios"}</div>
      <div class="doc-tagline">Crear. Lanzar. Crecer.</div>
    </div>

    <div class="doc-meta">
      <div class="doc-meta-item"><span class="doc-meta-lbl">Fecha</span><span class="doc-meta-val">${fmtDate(data.fecha)}</span></div>
      <div class="doc-meta-item"><span class="doc-meta-lbl">Cliente</span><span class="doc-meta-val">${esc(data.cliente) || "—"}</span></div>
      <div class="doc-meta-item"><span class="doc-meta-lbl">Preparado por</span><span class="doc-meta-val">${esc(data.preparadoPor)}</span></div>
      <div class="doc-meta-item"><span class="doc-meta-lbl">Moneda</span><span class="doc-meta-val">${esc(data.moneda)}</span></div>
    </div>

    <div class="doc-body">
      <table class="doc-table">
        <thead><tr>
          <th style="width:32px">#</th>
          <th>Descripción</th>
          <th style="width:52px">Cant.</th>
          <th class="r" style="width:130px">Precio unit.</th>
          <th class="r" style="width:130px">Subtotal</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="doc-totals">${tots}</div>
      ${notasHtml}
      <div class="doc-validez">Esta cotización tiene validez de ${data.validezDias} días hábiles desde la fecha de emisión.</div>
    </div>

    <div class="doc-footer">
      <div class="doc-footer-contacts">
        <div class="dfc-item"><span class="dfc-lbl">Email</span><span class="dfc-val">${esc(data.footer.email)}</span></div>
        <div class="dfc-item"><span class="dfc-lbl">Teléfono</span><span class="dfc-val">${esc(data.footer.telefono)}</span></div>
        <div class="dfc-item"><span class="dfc-lbl">Instagram</span><span class="dfc-val">${esc(data.footer.instagram)}</span></div>
      </div>
      <img src="${LOGO_DATA_URI}" alt="Meteoro" style="width: 75px; height: auto;">
    </div>
</div>
${plansPage}
</body>
</html>`;
}
