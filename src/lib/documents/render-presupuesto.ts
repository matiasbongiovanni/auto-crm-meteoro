import type { PresupuestoData } from "./types";
import { LOGO_DARK_DATA_URI } from "./logo";

function fmt(n: number, moneda: string): string {
  const currency = moneda === "USD" ? "USD" : moneda === "EUR" ? "EUR" : "ARS";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function renderPresupuesto(data: PresupuestoData): string {
  const subtotal = data.items.reduce((s, i) => s + i.cantidad * i.precioUnit, 0);
  const iva = data.mostrarIva ? (subtotal * data.ivaPct) / 100 : 0;
  const total = subtotal + iva;
  const m = data.meta.moneda;

  const fasesHtml = data.fases
    .map(
      (f) => `
    <div class="timeline-item">
      <div class="timeline-num">${f.numero}</div>
      <div>
        <div class="timeline-title">${f.titulo}</div>
        <div class="timeline-desc">${f.descripcion}</div>
      </div>
    </div>`
    )
    .join("");

  const itemsHtml = data.items
    .map((i) => {
      const sub = i.cantidad * i.precioUnit;
      return `
      <tr>
        <td><strong>${i.nombre}</strong>${i.detalle ? `<br><span class="item-detail">${i.detalle}</span>` : ""}</td>
        <td class="text-center">${i.cantidad}</td>
        <td class="text-right">${fmt(i.precioUnit, m)}</td>
        <td class="text-right"><strong>${fmt(sub, m)}</strong></td>
      </tr>`;
    })
    .join("");

  const ivaRow = data.mostrarIva
    ? `<tr class="total-row iva-row">
        <td colspan="3" class="text-right">IVA (${data.ivaPct}%)</td>
        <td class="text-right">${fmt(iva, m)}</td>
      </tr>`
    : "";

  const planesHtml = data.planes
    .map(
      (p) => `
    <div class="plan-card${p.premium ? " plan-premium" : ""}">
      ${p.premium ? '<div class="plan-badge">RECOMENDADO</div>' : ""}
      <div class="plan-name">${p.nombre}</div>
      <div class="plan-price">${fmt(p.precio, m)}<span class="plan-period">${p.periodo}</span></div>
      <ul class="plan-features">
        ${p.features.map((f) => `<li>${f}</li>`).join("")}
      </ul>
    </div>`
    )
    .join("");

  const metodosHtml = data.metodosPago
    .map(
      (mp) => `
    <div class="payment-card">
      <div class="payment-title">${mp.titulo}</div>
      ${mp.filas.map((f) => `<div class="payment-row"><span class="payment-label">${f.label}</span><span class="payment-val">${f.valor}</span></div>`).join("")}
    </div>`
    )
    .join("");

  const notasHtml = data.notas
    .split("\n")
    .map((l) => `<p>${l}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.titulo.titulo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Montserrat', sans-serif;
      background: #f8f8f8;
      color: #1a1a1a;
      font-size: 13px;
      line-height: 1.5;
    }

    .page {
      max-width: 794px;
      margin: 0 auto;
      background: #ffffff;
      box-shadow: 0 4px 40px rgba(0,0,0,0.10);
    }

    /* Header */
    .doc-header {
      background: #111111;
      padding: 28px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .doc-header img { height: 32px; }
    .doc-header-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #888;
      text-transform: uppercase;
    }
    .doc-header-client {
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      margin-top: 2px;
    }

    /* Title band */
    .title-band {
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      padding: 40px 40px 32px;
      color: #fff;
    }
    .cotizacion-label {
      font-size: 10px;
      letter-spacing: 3px;
      color: #888;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .doc-title {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .doc-tagline {
      font-size: 12px;
      color: #a09cf7;
      margin-top: 8px;
      letter-spacing: 1px;
    }

    /* Meta */
    .meta-section {
      background: #fafafa;
      border-bottom: 1px solid #e5e5e5;
      padding: 20px 40px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .meta-item label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #999;
      display: block;
      margin-bottom: 3px;
    }
    .meta-item span {
      font-size: 13px;
      font-weight: 600;
      color: #1a1a1a;
    }

    /* Content */
    .content { padding: 40px; }
    .section { margin-bottom: 48px; }
    .section-title {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      color: #5b4fd4;
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 2px solid #5b4fd4;
    }

    /* Timeline */
    .timeline-grid { display: flex; flex-direction: column; gap: 12px; }
    .timeline-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px;
      background: #fafafa;
      border-radius: 8px;
      border-left: 3px solid #5b4fd4;
    }
    .timeline-num {
      width: 32px;
      height: 32px;
      background: #5b4fd4;
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 14px;
      flex-shrink: 0;
    }
    .timeline-title { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
    .timeline-desc { font-size: 12px; color: #555; line-height: 1.4; }

    /* Table */
    .doc-table { width: 100%; border-collapse: collapse; }
    .doc-table thead tr { background: #111; color: #fff; }
    .doc-table thead th {
      padding: 10px 12px;
      text-align: left;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .doc-table thead th.text-center { text-align: center; }
    .doc-table thead th.text-right { text-align: right; }
    .doc-table tbody tr { border-bottom: 1px solid #f0f0f0; }
    .doc-table tbody tr:nth-child(even) { background: #fafafa; }
    .doc-table tbody td { padding: 12px; font-size: 13px; vertical-align: top; }
    .doc-table .text-center { text-align: center; }
    .doc-table .text-right { text-align: right; }
    .item-detail { font-size: 11px; color: #777; }
    .total-row td { padding: 10px 12px; font-weight: 600; border-top: 2px solid #e5e5e5; }
    .iva-row td { color: #777; font-weight: 500; border-top: none; }
    .grand-total-row td {
      padding: 14px 12px;
      font-size: 16px;
      font-weight: 800;
      background: #111;
      color: #fff;
      border-top: none;
    }

    /* Plans */
    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
    .plan-card {
      border: 1.5px solid #e5e5e5;
      border-radius: 12px;
      padding: 24px;
      position: relative;
    }
    .plan-card.plan-premium {
      border-color: #5b4fd4;
      background: #f9f8ff;
    }
    .plan-badge {
      position: absolute;
      top: -10px;
      left: 50%;
      transform: translateX(-50%);
      background: #5b4fd4;
      color: #fff;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 1.5px;
      padding: 3px 10px;
      border-radius: 20px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .plan-name { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
    .plan-price { font-size: 22px; font-weight: 800; color: #5b4fd4; }
    .plan-period { font-size: 13px; font-weight: 500; color: #888; }
    .plan-features { list-style: none; margin-top: 16px; }
    .plan-features li {
      padding: 5px 0;
      font-size: 12px;
      color: #444;
      border-bottom: 1px solid #f0f0f0;
      padding-left: 16px;
      position: relative;
    }
    .plan-features li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #5b4fd4;
      font-weight: 700;
    }

    /* Payment */
    .payment-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }
    .payment-card {
      background: #fafafa;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 16px;
    }
    .payment-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #1a1a1a;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid #5b4fd4;
    }
    .payment-row {
      display: flex;
      flex-direction: column;
      margin-bottom: 6px;
    }
    .payment-label { font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #999; }
    .payment-val { font-size: 12px; font-weight: 600; color: #1a1a1a; word-break: break-all; }

    /* Notes */
    .notes-box {
      background: #fafafa;
      border-left: 4px solid #5b4fd4;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
    }
    .notes-box p { font-size: 12px; color: #444; margin-bottom: 6px; }
    .notes-box p:last-child { margin-bottom: 0; }
    .validez {
      font-size: 11px;
      color: #888;
      margin-top: 12px;
      font-style: italic;
    }

    /* Footer */
    .doc-footer {
      background: #111;
      padding: 24px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .doc-footer img { height: 24px; opacity: 0.8; }
    .footer-contacts { display: flex; gap: 24px; align-items: center; }
    .footer-contact {
      font-size: 11px;
      color: #888;
    }
    .footer-contact strong { color: #ccc; }

    @media print {
      body { background: #fff; }
      .page { box-shadow: none; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="doc-header">
      <img src="${LOGO_DARK_DATA_URI}" alt="Meteoro" style="filter: invert(1);" />
      <div style="text-align: right;">
        <div class="doc-header-label">${data.header.label}</div>
        <div class="doc-header-client">${data.header.cliente}</div>
      </div>
    </div>

    <div class="title-band">
      <div class="cotizacion-label">${data.titulo.cotizacionLabel}</div>
      <div class="doc-title">${data.titulo.titulo}</div>
      <div class="doc-tagline">${data.titulo.tagline}</div>
    </div>

    <div class="meta-section">
      <div class="meta-item"><label>Fecha</label><span>${data.meta.fecha}</span></div>
      <div class="meta-item"><label>Cliente</label><span>${data.meta.cliente}</span></div>
      <div class="meta-item"><label>Preparado por</label><span>${data.meta.preparadoPor}</span></div>
      <div class="meta-item"><label>Moneda</label><span>${data.meta.moneda}</span></div>
    </div>

    <div class="content">

      <div class="section">
        <div class="section-title">${data.fasesTitulo}</div>
        <div class="timeline-grid">${fasesHtml}</div>
      </div>

      <div class="section">
        <div class="section-title">${data.propuestaTitulo}</div>
        <table class="doc-table">
          <thead>
            <tr>
              <th>Descripción</th>
              <th class="text-center">Cant.</th>
              <th class="text-right">Precio Unit.</th>
              <th class="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr class="total-row">
              <td colspan="3" class="text-right">Subtotal</td>
              <td class="text-right">${fmt(subtotal, m)}</td>
            </tr>
            ${ivaRow}
            <tr class="grand-total-row">
              <td colspan="3" class="text-right">TOTAL</td>
              <td class="text-right">${fmt(total, m)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">${data.planesTitulo}</div>
        <div class="plans-grid">${planesHtml}</div>
      </div>

      <div class="section">
        <div class="section-title">${data.metodosTitulo}</div>
        <div class="payment-grid">${metodosHtml}</div>
      </div>

      <div class="section">
        <div class="notes-box">${notasHtml}</div>
        <p class="validez">Validez: ${data.validez}</p>
      </div>

    </div>

    <div class="doc-footer">
      <img src="${LOGO_DARK_DATA_URI}" alt="Meteoro" style="filter: invert(1);" />
      <div class="footer-contacts">
        <div class="footer-contact"><strong>${data.footer.email}</strong></div>
        <div class="footer-contact"><strong>${data.footer.telefono}</strong></div>
        <div class="footer-contact"><strong>${data.footer.instagram}</strong></div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
