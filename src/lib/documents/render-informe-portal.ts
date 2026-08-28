import type { EcommerceMetricas, PedidosEstadoMetricas, PortalProject, PortalTask, PortalUpdate, PortalUser } from "@/types/portal";
import { LOGO_NUEVO_DATA_URI } from "./logo-nuevo";
import { plantillasCampanaFor } from "@/lib/ecommerce-metrics/plantillas-campana";

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}
function sum<T>(arr: T[], pick: (x: T) => number) {
  return arr.reduce((acc, x) => acc + pick(x), 0);
}

const CATEGORIA_LABEL: Record<string, string> = {
  diseno: "Diseño",
  desarrollo: "Desarrollo",
  contenido: "Contenido",
  testing: "Testing",
  entrega: "Entrega",
  otro: "Otro",
};

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completada: "Completada",
};

interface InformeParams {
  project: PortalProject & { porcentaje_calculado: number };
  portalUser: PortalUser;
  metricas?: EcommerceMetricas | null;
  pedidosMetricas?: PedidosEstadoMetricas | null;
}

const MAX_TASKS = 16;
const MAX_UPDATES = 4;

function renderTareas(tasks: PortalTask[]): string {
  if (tasks.length === 0) return "";
  const ordenadas = tasks.slice().sort((a, b) => a.orden - b.orden);
  const visibles = ordenadas.slice(0, MAX_TASKS);
  const restantes = ordenadas.length - visibles.length;
  const items = visibles
    .map(
      (t) => `
        <div class="task-row">
          <span class="task-titulo">${esc(t.titulo)}</span>
          <span class="task-cat">${esc(CATEGORIA_LABEL[t.category] || t.category)}</span>
          <span class="status-badge status-${esc(t.status)}">${esc(STATUS_LABEL[t.status] || t.status)}</span>
        </div>`
    )
    .join("");
  return `
    <div class="card">
      <div class="section-title">Tareas del proyecto</div>
      <div class="task-grid">${items}</div>
      ${restantes > 0 ? `<div class="more-note">+${esc(restantes)} tareas más</div>` : ""}
    </div>`;
}

function renderUpdates(updates: PortalUpdate[]): string {
  if (updates.length === 0) return "";
  const ordenadas = updates.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const visibles = ordenadas.slice(0, MAX_UPDATES);
  const restantes = ordenadas.length - visibles.length;
  const items = visibles
    .map(
      (u) => `
        <div class="update-item">
          <div class="update-date">${esc(fmtDate(u.fecha))} <span class="update-tipo">${esc(u.tipo)}</span></div>
          <div class="update-msg">${esc(u.mensaje)}</div>
        </div>`
    )
    .join("");
  return `
    <div class="card">
      <div class="section-title">Actualizaciones recientes</div>
      ${items}
      ${restantes > 0 ? `<div class="more-note">+${esc(restantes)} actualizaciones anteriores</div>` : ""}
    </div>`;
}

function renderMetricas(metricas: EcommerceMetricas, plantillasCampana: string[]): string {
  const { carritos, envios, mensajes } = metricas;
  const totalCarritos = sum(carritos, (c) => c.carritos);
  const totalRecuperadosCampana = sum(carritos, (c) => c.recuperados_campana);
  const ventasRecuperadas = sum(carritos, (c) => c.monto_recuperado_campana);
  const totalEnviados = sum(mensajes, (m) => m.enviados);
  const mensajesCarritoEnviados = sum(
    mensajes.filter((m) => plantillasCampana.includes(m.plantilla_key)),
    (m) => m.enviados
  );
  const tasaConversion =
    mensajesCarritoEnviados > 0 ? Math.round((totalRecuperadosCampana / mensajesCarritoEnviados) * 1000) / 10 : 0;

  const enviosPorCourier = envios.reduce<Record<string, { pedidos: number; entregados: number }>>((acc, e) => {
    const k = e.courier || "sin courier";
    if (!acc[k]) acc[k] = { pedidos: 0, entregados: 0 };
    acc[k].pedidos += e.pedidos;
    acc[k].entregados += e.entregados;
    return acc;
  }, {});
  const enviosResumen = Object.entries(enviosPorCourier)
    .map(([courier, d]) => `${courier}: ${d.entregados}/${d.pedidos}`)
    .join(" · ");

  return `
    <div class="card">
      <div class="section-title">Métricas — Recuperación de carritos por WhatsApp</div>
      <div class="meta-grid meta-grid-6">
        <div><div class="meta-label">Carritos abandonados</div><div class="meta-value">${esc(totalCarritos)}</div></div>
        <div><div class="meta-label">Recuperados WhatsApp</div><div class="meta-value">${esc(totalRecuperadosCampana)}</div></div>
        <div><div class="meta-label">Conversión</div><div class="meta-value">${esc(tasaConversion)}%</div></div>
        <div><div class="meta-label">Ventas recuperadas</div><div class="meta-value">$ ${esc(fmtMoney(ventasRecuperadas))}</div></div>
        <div><div class="meta-label">Mensajes enviados</div><div class="meta-value">${esc(totalEnviados)}</div></div>
        ${enviosResumen ? `<div><div class="meta-label">Envíos</div><div class="meta-value meta-value-sm">${esc(enviosResumen)}</div></div>` : "<div></div>"}
      </div>
    </div>`;
}

function renderMetricasPedidos(metricas: PedidosEstadoMetricas): string {
  const { confirmados, reprogramados, cancelados, sin_accion } = metricas.totales;
  const total = confirmados + reprogramados + cancelados + sin_accion;
  const pctConfirmados = total > 0 ? Math.round((confirmados / total) * 1000) / 10 : 0;
  const pctFriccion = total > 0 ? Math.round(((cancelados + reprogramados) / total) * 1000) / 10 : 0;

  return `
    <div class="card">
      <div class="section-title">Métricas — Confirmación de pedidos por WhatsApp</div>
      <div class="meta-grid meta-grid-6">
        <div><div class="meta-label">Confirmados</div><div class="meta-value">${esc(confirmados)}</div></div>
        <div><div class="meta-label">Reprogramados</div><div class="meta-value">${esc(reprogramados)}</div></div>
        <div><div class="meta-label">Cancelados</div><div class="meta-value">${esc(cancelados)}</div></div>
        <div><div class="meta-label">Sin acción</div><div class="meta-value">${esc(sin_accion)}</div></div>
        <div><div class="meta-label">% Confirmados</div><div class="meta-value">${esc(pctConfirmados)}%</div></div>
        <div><div class="meta-label">% Cancelados + reprog.</div><div class="meta-value">${esc(pctFriccion)}%</div></div>
      </div>
    </div>`;
}

export function renderInformePortal({ project, portalUser, metricas, pedidosMetricas }: InformeParams): string {
  const tasks = project.tasks ?? [];
  const updates = project.updates ?? [];
  const completadas = tasks.filter((t) => t.status === "completada").length;
  const fechaGeneracion = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Informe - ${esc(project.nombre_proyecto)}</title>
<style>
  @page { size: A4; margin: 0; }
  html,body { height: auto; }
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #08080a; color: #fff; font-family: 'Geist', 'Inter', sans-serif; display: flex; justify-content: center; padding: 0; }
  .doc { width: 794px; height: 1123px; overflow: hidden; background: #08080a; position: relative; display: flex; flex-direction: column; }
  .glow { position: absolute; top: -260px; left: 50%; transform: translateX(-50%); width: 900px; height: 900px; border-radius: 50%; background: radial-gradient(circle, #ffffff 0%, transparent 70%); opacity: .08; filter: blur(140px); pointer-events: none; }
  .topbar { height: 2px; width: 100%; background: rgba(255,255,255,.06); }
  .topbar-fill { height: 100%; background: #fff; box-shadow: 0 0 12px rgba(255,255,255,.5); }
  header { position: relative; z-index: 1; padding: 28px 48px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,.06); }
  header img { height: 34px; width: auto; object-fit: contain; }
  .hdr-right { text-align: right; }
  .hdr-label { font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: rgba(255,255,255,.3); font-weight: 600; }
  .hdr-value { font-size: 13px; font-weight: 700; margin-top: 3px; }
  main { position: relative; z-index: 1; flex: 1; padding: 30px 48px; overflow: hidden; display: flex; flex-direction: column; gap: 16px; }
  .eyebrow { font-size: 10px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: rgba(255,255,255,.3); margin-bottom: 6px; }
  h1 { font-size: 26px; font-weight: 800; letter-spacing: -.02em; margin-bottom: 4px; }
  .sub { font-size: 12px; color: rgba(255,255,255,.4); }
  .card { border-radius: 16px; background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.08); padding: 18px 24px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: rgba(255,255,255,.35); border-bottom: 1px solid rgba(255,255,255,.08); padding-bottom: 8px; margin-bottom: 12px; }
  .meta-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 18px; }
  .meta-grid-6 { grid-template-columns: repeat(3, 1fr); row-gap: 14px; }
  .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: .14em; color: rgba(255,255,255,.3); margin-bottom: 4px; font-weight: 600; }
  .meta-value { font-size: 16px; font-weight: 700; color: #fff; }
  .meta-value-sm { font-size: 11px; font-weight: 500; color: rgba(255,255,255,.75); }
  .task-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
  .task-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,.05); }
  .task-titulo { font-size: 12px; color: rgba(255,255,255,.85); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .task-cat { font-size: 9px; color: rgba(255,255,255,.3); text-transform: uppercase; letter-spacing: .06em; flex-shrink: 0; }
  .status-badge { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; flex-shrink: 0; }
  .status-completada { background: rgba(52,211,153,.12); color: #34d399; border: 1px solid rgba(52,211,153,.25); }
  .status-en_progreso { background: rgba(251,191,36,.12); color: #fbbf24; border: 1px solid rgba(251,191,36,.25); }
  .status-pendiente { background: rgba(255,255,255,.05); color: rgba(255,255,255,.5); border: 1px solid rgba(255,255,255,.1); }
  .more-note { margin-top: 10px; font-size: 10px; color: rgba(255,255,255,.25); text-transform: uppercase; letter-spacing: .08em; }
  .update-item { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,.05); }
  .update-item:last-child { border-bottom: none; }
  .update-date { font-size: 9px; color: rgba(255,255,255,.3); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 3px; }
  .update-tipo { color: #f87171; margin-left: 6px; }
  .update-msg { font-size: 12px; color: rgba(255,255,255,.8); line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  footer { position: relative; z-index: 1; padding: 22px 48px; border-top: 1px solid rgba(255,255,255,.06); display: flex; justify-content: space-between; align-items: center; }
  footer img { height: 18px; width: auto; object-fit: contain; opacity: .4; }
  .foot-note { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.2); }
</style>
</head>
<body>
<div class="doc">
  <div class="glow"></div>
  <div class="topbar"><div class="topbar-fill" style="width:${esc(project.porcentaje_calculado)}%"></div></div>
  <header>
    <img src="${LOGO_NUEVO_DATA_URI}" alt="meteoro." />
    <div class="hdr-right">
      <div class="hdr-label">Informe de proyecto</div>
      <div class="hdr-value">${esc(fechaGeneracion)}</div>
    </div>
  </header>

  <main>
    <div>
      <div class="eyebrow">Seguimiento del proyecto</div>
      <h1>${esc(project.nombre_proyecto)}</h1>
      <div class="sub">Meteoro Agencia · Córdoba, Argentina · Cliente: ${esc(portalUser.nombre)}</div>
    </div>

    <div class="card">
      <div class="meta-grid">
        <div><div class="meta-label">Avance</div><div class="meta-value">${esc(project.porcentaje_calculado)}%</div></div>
        <div><div class="meta-label">Tareas</div><div class="meta-value">${esc(completadas)}/${esc(tasks.length)}</div></div>
        <div><div class="meta-label">Inicio</div><div class="meta-value">${esc(fmtDate(project.fecha_inicio))}</div></div>
        ${project.fecha_estimada ? `<div><div class="meta-label">Entrega estimada</div><div class="meta-value">${esc(fmtDate(project.fecha_estimada))}</div></div>` : "<div></div>"}
        <div></div>
      </div>
    </div>

    ${metricas ? renderMetricas(metricas, plantillasCampanaFor(project.metricas_source)) : ""}
    ${pedidosMetricas ? renderMetricasPedidos(pedidosMetricas) : ""}
    ${renderTareas(tasks)}
    ${renderUpdates(updates)}
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
