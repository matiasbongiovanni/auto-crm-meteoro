import type { BienvenidaData, OnboardingData } from "./types";
import { LOGO_DATA_URI } from "./logo";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function firmaHTML(lado: string, nombre: string, cargo: string): string {
  return `<div class="sig-block">
    <div class="sig-label">${esc(lado)}</div>
    <div class="sig-line"></div>
    <div class="sig-name">${esc(nombre || "—")}</div>
    <div class="sig-role">${esc(cargo || "")}</div>
    <div class="sig-date">Fecha: _____ / _____ / _________</div>
  </div>`;
}

const SHARED_CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#fff;color:#000;font-size:13px}

  .doc{width:794px;min-height:1123px;background:#fff;color:#000;font-family:'Inter',sans-serif;display:flex;flex-direction:column}

  .doc-header{background:#000;padding:24px 48px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
  .doc-header img{height:64px}
  .doc-header-right{text-align:right}
  .dh-label{font-size:9px;color:#666;letter-spacing:.14em;text-transform:uppercase;font-weight:500}
  .dh-title{font-size:14px;font-weight:600;color:#fff;margin-top:2px}

  .doc-title-band{background:#f5f5f5;border-bottom:3px solid #000;padding:28px 48px}
  .doc-badge{font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#aaa;margin-bottom:6px}
  .doc-ptitle{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:38px;color:#000;line-height:1.05;letter-spacing:.01em}
  .doc-tagline{font-size:11px;color:#bbb;margin-top:6px;font-style:italic}

  .doc-meta{padding:16px 48px;display:flex;gap:32px;border-bottom:1px solid #ececec;flex-wrap:wrap}
  .doc-meta-item{display:flex;flex-direction:column}
  .doc-meta-lbl{font-size:8px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#bbb;margin-bottom:3px}
  .doc-meta-val{font-size:13px;font-weight:600;color:#000}

  .doc-body{padding:28px 48px;flex:1}

  .doc-section{margin-bottom:26px;break-inside:avoid;page-break-inside:avoid}
  .doc-section-page-break{break-before:page;page-break-before:always}
  .doc-section-title{font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#000;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #000}
  .doc-section-content{font-size:13px;color:#333;line-height:1.8;white-space:pre-wrap}

  .team-block{display:flex;gap:28px;flex-wrap:wrap;margin-top:4px;break-inside:avoid;page-break-inside:avoid}
  .team-member{background:#f9f9f9;border:1px solid #ececec;border-radius:4px;padding:12px 16px;min-width:180px}
  .team-member-name{font-size:13px;font-weight:700;color:#000}
  .team-member-role{font-size:10px;color:#999;letter-spacing:.08em;text-transform:uppercase;margin-top:1px}
  .team-member-contact{margin-top:8px}
  .team-member-contact span{display:block;font-size:11px;color:#555;margin-top:2px}

  .portal-block{background:#f5f5f5;border-left:3px solid #000;padding:16px 20px;border-radius:0 4px 4px 0;margin-top:4px;break-inside:avoid;page-break-inside:avoid}
  .portal-note{font-size:11px;color:#888;font-style:italic;margin-bottom:10px}
  .portal-row{display:flex;gap:4px;align-items:baseline;margin-top:6px}
  .portal-key{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#bbb;min-width:80px}
  .portal-val{font-size:13px;font-weight:600;color:#000}

  .steps-list{margin-top:4px;padding-left:0;list-style:none}
  .steps-list li{display:flex;gap:12px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;break-inside:avoid;page-break-inside:avoid}
  .steps-list li:last-child{border-bottom:none}
  .step-num{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:18px;color:#000;min-width:24px;line-height:1.2}

  .phases-table{width:100%;border-collapse:collapse;margin-top:4px}
  .phases-table thead tr{background:#000;color:#fff}
  .phases-table thead th{padding:8px 12px;font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;text-align:left}
  .phases-table tbody tr{border-bottom:1px solid #f0f0f0;break-inside:avoid;page-break-inside:avoid}
  .phases-table tbody tr:last-child{border-bottom:none}
  .phases-table tbody td{padding:10px 12px;font-size:12px;vertical-align:top}
  .phase-name{font-weight:600;color:#000}
  .phase-desc{font-size:11px;color:#888;margin-top:2px}
  .phase-badge{display:inline-block;padding:2px 8px;border-radius:2px;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
  .phase-badge.pendiente{background:#f0f0f0;color:#888}
  .phase-badge.en-curso{background:#000;color:#fff}
  .phase-badge.completado{background:#1a1a1a;color:#ccc}

  .deliverables-list{list-style:none;padding:0;margin-top:4px}
  .deliverables-list li{display:flex;gap:10px;align-items:flex-start;padding:6px 0;font-size:13px;color:#333;border-bottom:1px solid #f5f5f5;break-inside:avoid;page-break-inside:avoid}
  .deliverables-list li:last-child{border-bottom:none}
  .deliverable-num{font-size:14px;font-weight:700;color:#000;margin-top:1px;min-width:18px;line-height:1.2}

  .compromisos-list{list-style:none;padding:0;margin-top:4px}
  .compromisos-list li{display:flex;gap:10px;align-items:flex-start;padding:6px 0;font-size:13px;color:#333;border-bottom:1px solid #f5f5f5}
  .compromisos-list li:last-child{border-bottom:none}
  .compromiso-check{font-size:14px;margin-top:1px}

  .dyn-section{margin-bottom:20px}
  .dyn-section-title{font-size:11px;font-weight:700;color:#000;margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em}
  .dyn-section-content{font-size:13px;color:#333;line-height:1.75;white-space:pre-wrap}

  .doc-signature{padding:24px 48px;border-top:1px solid #ececec;display:grid;grid-template-columns:1fr 1fr;gap:40px;break-inside:avoid;page-break-inside:avoid}
  .sig-block{}
  .sig-label{font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#bbb;margin-bottom:24px}
  .sig-line{border-bottom:1px solid #000;width:100%;margin-bottom:8px}
  .sig-name{font-size:13px;font-weight:600;color:#000}
  .sig-role{font-size:10px;color:#999;margin-top:2px}
  .sig-date{font-size:10px;color:#bbb;margin-top:4px}

  .doc-footer{background:#000;padding:14px 48px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;break-inside:avoid;page-break-inside:avoid}
  .doc-footer-contacts{display:flex;gap:22px}
  .dfc-item{display:flex;flex-direction:column}
  .dfc-lbl{font-size:8px;color:#555;letter-spacing:.14em;text-transform:uppercase;font-weight:600;margin-bottom:2px}
  .dfc-val{font-size:11px;color:#ccc;font-weight:500}
  .doc-footer-logo img{height:36px;opacity:.6}

  @media print{
    body{background:#fff!important}
    .doc{box-shadow:none!important;width:100%!important;min-height:auto!important}
    .doc-section-page-break{break-before:page;page-break-before:always}
    @page{margin:12mm;size:A4}
  }
`;

function htmlWrapper(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>${SHARED_CSS}</style>
</head>
<body>
<div class="doc">
${body}
</div>
</body>
</html>`;
}

export function renderBienvenida(data: BienvenidaData): string {
  const pasos = data.pasos.split("\n").filter((p) => p.trim());

  const body = `
  <div class="doc-header">
    <img src="${LOGO_DATA_URI}" alt="Meteoro">
    <div class="doc-header-right">
      <div class="dh-label">Fecha</div>
      <div class="dh-title">${fmtDate(data.fecha)}</div>
    </div>
  </div>

  <div class="doc-title-band">
    <div class="doc-badge">Carta de Bienvenida</div>
    <div class="doc-ptitle">Bienvenido/a,<br>${esc(data.cliente)}</div>
    ${data.empresa ? `<div class="doc-tagline">${esc(data.empresa)}</div>` : ""}
  </div>

  <div class="doc-body">
    ${data.showMensaje ? `
    <div class="doc-section">
      <div class="doc-section-title">Mensaje de bienvenida</div>
      <div class="doc-section-content">${esc(data.mensaje)}</div>
    </div>` : ""}

    ${data.showEquipo ? `
    <div class="doc-section">
      <div class="doc-section-title">Tu equipo en Meteoro</div>
      <div class="team-block">
        <div class="team-member">
          <div class="team-member-name">Matías Bongiovanni</div>
          <div class="team-member-role">CEO &amp; Fundador</div>
          <div class="team-member-contact">
            <span>WhatsApp: +54 9 3472 548379</span>
            <span>Email: contacto@meteoro.com.ar</span>
            <span>Horario: Lun–Vie 9:00–19:00 ART</span>
          </div>
        </div>
      </div>
    </div>` : ""}

    ${data.showPortal ? `
    <div class="doc-section">
      <div class="doc-section-title">Portal de clientes</div>
      <div class="portal-block">
        <div class="portal-note">Tu portal está en desarrollo activo. Próximamente podrás ver métricas, conversaciones y el estado de tu sistema en tiempo real desde aquí.</div>
        <div class="portal-row"><span class="portal-key">URL</span><span class="portal-val">${esc(data.portalUrl)}</span></div>
        ${data.portalUser ? `<div class="portal-row"><span class="portal-key">Usuario</span><span class="portal-val">${esc(data.portalUser)}</span></div>` : ""}
        ${data.portalPass ? `<div class="portal-row"><span class="portal-key">Contraseña</span><span class="portal-val">${esc(data.portalPass)}</span></div>` : ""}
      </div>
    </div>` : ""}

    ${data.showPasos && pasos.length ? `
    <div class="doc-section">
      <div class="doc-section-title">Próximos pasos</div>
      <ol class="steps-list">
        ${pasos.map((p, i) => `<li><span class="step-num">${i + 1}</span><span>${esc(p.trim())}</span></li>`).join("")}
      </ol>
    </div>` : ""}
  </div>

  <div class="doc-signature">
    ${firmaHTML("Por Meteoro Agencia", data.firmaMeteoro, data.firmaCargo)}
    ${firmaHTML("Por " + (data.empresa || "el cliente"), data.cliente, data.empresa)}
  </div>

  <div class="doc-footer">
    <div class="doc-footer-contacts">
      <div class="dfc-item"><span class="dfc-lbl">WhatsApp</span><span class="dfc-val">${esc(data.footer.whatsapp)}</span></div>
      <div class="dfc-item"><span class="dfc-lbl">Email</span><span class="dfc-val">${esc(data.footer.email)}</span></div>
      <div class="dfc-item"><span class="dfc-lbl">Web</span><span class="dfc-val">${esc(data.footer.web)}</span></div>
    </div>
    <div class="doc-footer-logo"><img src="${LOGO_DATA_URI}" alt="Meteoro"></div>
  </div>`;

  return htmlWrapper(`Bienvenida — ${data.cliente}`, body);
}

export function renderOnboarding(data: OnboardingData): string {
  const seccionesHTML = data.secciones
    .filter((s) => s.titulo || s.contenido)
    .map(
      (s) => `<div class="dyn-section">
      <div class="dyn-section-title">${esc(s.titulo || "Sin título")}</div>
      <div class="dyn-section-content">${esc(s.contenido || "—")}</div>
    </div>`
    )
    .join("");

  const fasesHTML = data.fases.length
    ? `<table class="phases-table">
      <thead><tr><th>Fase</th><th>Duración estimada</th><th>Estado</th></tr></thead>
      <tbody>
        ${data.fases
          .map(
            (f) => `<tr>
          <td><div class="phase-name">${esc(f.nombre || "—")}</div>${f.desc ? `<div class="phase-desc">${esc(f.desc)}</div>` : ""}</td>
          <td>${esc(f.duracion || "—")}</td>
          <td><span class="phase-badge ${f.estado}">${(f.estado || "").replace("-", " ")}</span></td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table>`
    : `<p style="font-size:13px;color:#bbb">No se agregaron fases.</p>`;

  const entregablesHTML = data.entregables
    ? `<ul class="deliverables-list">${data.entregables
        .split("\n")
        .filter((l) => l.trim())
        .map((l, i) => `<li><span class="deliverable-num">${i + 1}</span><span>${esc(l.trim())}</span></li>`)
        .join("")}</ul>`
    : `<p style="font-size:13px;color:#bbb">Sin entregables definidos.</p>`;

  const compromisosHTML = data.compromisos
    ? `<ul class="compromisos-list">${data.compromisos
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => `<li><span class="compromiso-check">✓</span><span>${esc(l.trim())}</span></li>`)
        .join("")}</ul>`
    : `<p style="font-size:13px;color:#bbb">Sin compromisos definidos.</p>`;

  const body = `
  <div class="doc-header">
    <img src="${LOGO_DATA_URI}" alt="Meteoro">
    <div class="doc-header-right">
      <div class="dh-label">Documento de</div>
      <div class="dh-title">Onboarding</div>
    </div>
  </div>

  <div class="doc-title-band">
    <div class="doc-badge">Onboarding</div>
    <div class="doc-ptitle">${esc(data.empresa || data.cliente)}</div>
    ${data.empresa && data.cliente !== data.empresa ? `<div class="doc-tagline">Responsable: ${esc(data.cliente)}</div>` : ""}
  </div>

  <div class="doc-meta">
    ${data.showResp ? `
    <div class="doc-meta-item"><div class="doc-meta-lbl">Responsable cliente</div><div class="doc-meta-val">${esc(data.respCliente || "—")}</div></div>
    <div class="doc-meta-item"><div class="doc-meta-lbl">Responsable Meteoro</div><div class="doc-meta-val">${esc(data.respMeteoro)}</div></div>
    <div class="doc-meta-item"><div class="doc-meta-lbl">Fecha de inicio</div><div class="doc-meta-val">${fmtDate(data.fechaInicio)}</div></div>
    <div class="doc-meta-item"><div class="doc-meta-lbl">Entrega estimada</div><div class="doc-meta-val">${fmtDate(data.fechaEntrega)}</div></div>` : ""}
    <div class="doc-meta-item"><div class="doc-meta-lbl">Documento</div><div class="doc-meta-val">${fmtDate(data.fecha)}</div></div>
  </div>

  <div class="doc-body">
    ${data.showSecciones && seccionesHTML ? `
    <div class="doc-section">
      <div class="doc-section-title">Datos y accesos del proyecto</div>
      ${seccionesHTML}
    </div>` : ""}

    ${data.showFases ? `
    <div class="doc-section">
      <div class="doc-section-title">Fases del desarrollo</div>
      ${fasesHTML}
    </div>` : ""}

    ${data.showEntregables ? `
    <div class="doc-section">
      <div class="doc-section-title">Entregables del proyecto</div>
      ${entregablesHTML}
    </div>` : ""}

    ${data.showCompromisos ? `
    <div class="doc-section doc-section-page-break">
      <div class="doc-section-title">Compromisos mutuos</div>
      ${compromisosHTML}
    </div>` : ""}

    ${data.showSla && data.sla ? `
    <div class="doc-section">
      <div class="doc-section-title">Soporte y SLA</div>
      <div class="doc-section-content">${esc(data.sla)}</div>
    </div>` : ""}
  </div>

  <div class="doc-signature">
    ${firmaHTML("Por Meteoro Agencia", data.firmaMeteoro, data.firmaCargo)}
    ${firmaHTML("Por " + (data.empresa || "el cliente"), data.cliente, data.empresa)}
  </div>

  <div class="doc-footer">
    <div class="doc-footer-contacts">
      <div class="dfc-item"><span class="dfc-lbl">WhatsApp</span><span class="dfc-val">${esc(data.footer.whatsapp)}</span></div>
      <div class="dfc-item"><span class="dfc-lbl">Email</span><span class="dfc-val">${esc(data.footer.email)}</span></div>
      <div class="dfc-item"><span class="dfc-lbl">Web</span><span class="dfc-val">${esc(data.footer.web)}</span></div>
    </div>
    <div class="doc-footer-logo"><img src="${LOGO_DATA_URI}" alt="Meteoro"></div>
  </div>`;

  return htmlWrapper(`Onboarding — ${data.empresa || data.cliente}`, body);
}
