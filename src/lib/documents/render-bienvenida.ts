import type { BienvenidaData } from "./types";
import { LOGO_LIGHT_DATA_URI } from "./logo";

export function renderBienvenida(data: BienvenidaData): string {
  const contactosHtml = data.equipo.contactos
    .map((c) => `<div class="contact-row"><span class="contact-label">${c.label}</span><span class="contact-val">${c.valor}</span></div>`)
    .join("");

  const pasosHtml = data.pasos
    .map(
      (p) => `
    <div class="step-card">
      <div class="step-number">${p.numero}</div>
      <div class="step-text">${p.texto}</div>
    </div>`
    )
    .join("");

  const firmasHtml = data.firmas
    .map(
      (f) => `
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-empresa">${f.empresa}</div>
      ${f.nombre ? `<div class="sig-nombre">${f.nombre}</div>` : ""}
      <div class="sig-rol">${f.rol}</div>
      <div class="sig-fecha">${f.fecha}</div>
    </div>`
    )
    .join("");

  const cuerpoParrafos = data.mensaje.cuerpo
    .split("\n\n")
    .map((p) => `<p>${p}</p>`)
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
      background: #0a0a0a;
      color: #f0f0f0;
      font-size: 13px;
      line-height: 1.6;
      min-height: 100vh;
    }

    .efecto-luz {
      position: fixed;
      top: -20%;
      left: 50%;
      transform: translateX(-50%);
      width: 800px;
      height: 500px;
      background: radial-gradient(ellipse at center, rgba(160, 156, 247, 0.12) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    .page {
      position: relative;
      z-index: 1;
      max-width: 794px;
      margin: 40px auto;
      background: #111111;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 0 80px rgba(160, 156, 247, 0.08);
    }

    /* Header */
    .doc-header {
      padding: 28px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .doc-header img { height: 32px; }
    .doc-header-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #555;
      text-transform: uppercase;
    }
    .doc-header-client {
      font-size: 12px;
      font-weight: 600;
      color: #aaa;
      margin-top: 2px;
      text-align: right;
    }

    /* Title band */
    .title-band {
      padding: 40px 40px 32px;
      background: linear-gradient(135deg, #0d0d0d 0%, #161616 100%);
      border-bottom: 1px solid rgba(160,156,247,0.15);
    }
    .doc-date {
      font-size: 10px;
      letter-spacing: 2.5px;
      color: #a09cf7;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .doc-title {
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #f8f8f8;
      line-height: 1.1;
    }

    /* Content */
    .content { padding: 40px; }
    .section { margin-bottom: 44px; }
    .section-title {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      color: #a09cf7;
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(160,156,247,0.25);
    }

    /* Message */
    .msg-saludo {
      font-size: 20px;
      font-weight: 700;
      color: #f0f0f0;
      margin-bottom: 16px;
    }
    .msg-body p {
      font-size: 13px;
      color: #aaa;
      margin-bottom: 12px;
      line-height: 1.7;
    }

    /* Team */
    .team-card {
      background: #1a1a1a;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 24px;
      display: flex;
      align-items: flex-start;
      gap: 20px;
    }
    .team-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #5b4fd4, #a09cf7);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 800;
      color: #fff;
      flex-shrink: 0;
    }
    .team-info { flex: 1; }
    .team-name { font-size: 16px; font-weight: 700; color: #f0f0f0; margin-bottom: 2px; }
    .team-rol { font-size: 11px; color: #a09cf7; letter-spacing: 0.5px; margin-bottom: 14px; }
    .contact-row { display: flex; gap: 10px; align-items: center; margin-bottom: 6px; }
    .contact-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #555;
      min-width: 70px;
    }
    .contact-val { font-size: 12px; font-weight: 500; color: #ccc; }

    /* Steps */
    .steps-grid { display: flex; flex-direction: column; gap: 12px; }
    .step-card {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      background: #1a1a1a;
      border: 1px solid rgba(255,255,255,0.05);
      border-left: 3px solid #a09cf7;
      border-radius: 0 8px 8px 0;
      padding: 16px;
    }
    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #a09cf7;
      color: #0a0a0a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 14px;
      flex-shrink: 0;
    }
    .step-text { font-size: 13px; color: #ccc; line-height: 1.5; padding-top: 6px; }

    /* Signatures */
    .signatures-section {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 32px;
      margin-top: 8px;
    }
    .sig-block { }
    .sig-line {
      height: 1px;
      background: rgba(255,255,255,0.2);
      margin-bottom: 12px;
    }
    .sig-empresa { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #a09cf7; text-transform: uppercase; margin-bottom: 4px; }
    .sig-nombre { font-size: 14px; font-weight: 600; color: #f0f0f0; margin-bottom: 2px; }
    .sig-rol { font-size: 11px; color: #777; }
    .sig-fecha { font-size: 10px; color: #555; margin-top: 4px; }

    /* Footer */
    .doc-footer {
      background: #0a0a0a;
      border-top: 1px solid rgba(255,255,255,0.06);
      padding: 24px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .doc-footer img { height: 24px; opacity: 0.7; }
    .footer-contacts { display: flex; gap: 24px; align-items: center; }
    .footer-contact { font-size: 11px; color: #555; }
    .footer-contact strong { color: #888; }

    @media print {
      body { background: #0a0a0a; }
      .efecto-luz { display: none; }
      .page { margin: 0; box-shadow: none; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="efecto-luz"></div>
  <div class="page">
    <div class="doc-header">
      <img src="${LOGO_LIGHT_DATA_URI}" alt="Meteoro" />
      <div style="text-align: right;">
        <div class="doc-header-label">${data.header.label}</div>
        <div class="doc-header-client">${data.header.cliente}</div>
      </div>
    </div>

    <div class="title-band">
      <div class="doc-date">${data.titulo.fecha}</div>
      <div class="doc-title">${data.titulo.titulo}</div>
    </div>

    <div class="content">

      <div class="section">
        <div class="msg-saludo">${data.mensaje.saludo}</div>
        <div class="msg-body">${cuerpoParrafos}</div>
      </div>

      <div class="section">
        <div class="section-title">${data.equipo.titulo}</div>
        <div class="team-card">
          <div class="team-avatar">${data.equipo.nombre.charAt(0).toUpperCase()}</div>
          <div class="team-info">
            <div class="team-name">${data.equipo.nombre}</div>
            <div class="team-rol">${data.equipo.rol}</div>
            ${contactosHtml}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">${data.pasosTitulo}</div>
        <div class="steps-grid">${pasosHtml}</div>
      </div>

      <div class="section">
        <div class="section-title">FIRMAS</div>
        <div class="signatures-section">${firmasHtml}</div>
      </div>

    </div>

    <div class="doc-footer">
      <img src="${LOGO_LIGHT_DATA_URI}" alt="Meteoro" />
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
