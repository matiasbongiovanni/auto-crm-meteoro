import Image from "next/image";
import { PortalProgress } from "./PortalProgress";
import { PortalTaskList } from "./PortalTaskList";
import { PortalTimeline } from "./PortalTimeline";
import { PortalMetricas } from "./PortalMetricas";
import { PortalMetricasPedidos } from "./PortalMetricasPedidos";
import { PortalPdfButton } from "./PortalPdfButton";
import { plantillasCampanaFor } from "@/lib/ecommerce-metrics/plantillas-campana";
import type { PortalProject, PortalTask, PortalUser, EcommerceMetricas, PedidosEstadoMetricas, PortalBilling } from "@/types/portal";

function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="w-1 h-3 rounded-full bg-white/25" />
      <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">{children}</h2>
      {count != null && <span className="ml-auto text-[10px] text-white/20 tabular-nums">{count}</span>}
    </div>
  );
}

function formatShort(fecha: string) {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function diasRestantes(fecha: string): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(fecha + "T00:00:00").getTime() - hoy.getTime()) / 86400000);
}

type Props = {
  project: PortalProject & { porcentaje_calculado: number };
  portalUser: PortalUser;
  metricas?: EcommerceMetricas | null;
  pedidosMetricas?: PedidosEstadoMetricas | null;
  billing?: PortalBilling | null;
};

export function PortalView({ project, portalUser, metricas, pedidosMetricas, billing }: Props) {
  const tasks = project.tasks ?? [];
  const updates = project.updates ?? [];
  const completadas = tasks.filter((t: PortalTask) => t.status === "completada").length;
  const enProgreso = tasks.filter((t: PortalTask) => t.status === "en_progreso").length;
  const porcentaje = project.porcentaje_calculado;
  const dias = project.fecha_estimada ? diasRestantes(project.fecha_estimada) : null;
  const esDashboardOperativo = !!metricas || !!pedidosMetricas;
  const diasPago = billing?.proximo_pago ? diasRestantes(billing.proximo_pago) : null;

  return (
    <div className="relative min-h-screen bg-[#08080a] text-white overflow-hidden">

      {/* Iluminación ambiental */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-52 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-[0.10] blur-[140px] z-0"
        style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
      />

      {/* Barra de progreso top */}
      <div className="relative z-10 h-px w-full bg-white/5">
        <div className="h-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.5)] transition-all duration-1000" style={{ width: `${porcentaje}%` }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Image
            src="/brand/meteoro-logo-nuevo.png"
            alt="meteoro."
            width={281}
            height={89}
            className="h-8 w-auto object-contain drop-shadow-[0_2px_16px_rgba(255,255,255,0.14)]"
            priority
          />
          <div className="flex items-center gap-3">
            <PortalPdfButton project={project} portalUser={portalUser} metricas={metricas} pedidosMetricas={pedidosMetricas} />
            <span className="text-sm text-white/45">{portalUser.nombre}</span>
            <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[13px] font-bold text-white/70 uppercase shadow-[0_4px_16px_-4px_rgba(0,0,0,0.6)]">
              {portalUser.nombre.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 space-y-8">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/8 p-8 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_24px_60px_-24px_rgba(0,0,0,0.7)]">
          <div className="relative space-y-5">
            {/* Encabezado del proyecto */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30 mb-3">
                Seguimiento del proyecto
              </p>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-white">
                {project.nombre_proyecto}
              </h1>
              {project.descripcion && (
                <p className="mt-3 text-sm text-white/40 leading-relaxed max-w-2xl">{project.descripcion}</p>
              )}
            </div>

            {/* Divisor */}
            <div className="h-px bg-white/[0.06]" />

            {/* Stats row */}
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Avance</p>
                <p className="text-2xl font-bold text-white tabular-nums">{porcentaje}%</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Tareas</p>
                <p className="text-2xl font-bold text-white tabular-nums">{completadas}<span className="text-white/30 font-light">/{tasks.length}</span></p>
              </div>
              {enProgreso > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">En progreso</p>
                  <p className="text-2xl font-bold text-white tabular-nums">{enProgreso}</p>
                </div>
              )}
              {project.fecha_estimada && (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Entrega est.</p>
                  <p className="text-2xl font-bold text-white">{formatShort(project.fecha_estimada)}</p>
                </div>
              )}
              {dias != null && (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">
                    {dias >= 0 ? "Días restantes" : "Días de retraso"}
                  </p>
                  <p className={`text-2xl font-bold tabular-nums ${dias < 0 ? "text-red-400" : "text-white"}`}>
                    {Math.abs(dias)}
                  </p>
                </div>
              )}
              {billing?.proximo_pago && diasPago != null && (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Próximo pago</p>
                  <p className={`text-2xl font-bold tabular-nums ${diasPago <= 0 ? "text-amber-300" : "text-white"}`}>
                    {diasPago === 0 ? "Hoy" : formatShort(billing.proximo_pago)}
                  </p>
                  {billing.ciclo_nota && <p className="text-[10px] text-white/25 mt-1">{billing.ciclo_nota}</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard operativo (ecommerce/servicio en marcha): métricas primero, es lo que el cliente vino a ver */}
        {metricas && <PortalMetricas metricas={metricas} plantillasCampana={plantillasCampanaFor(project.metricas_source)} />}
        {pedidosMetricas && <PortalMetricasPedidos metricas={pedidosMetricas} />}

        {/* Progreso + Tareas — en dashboards operativos queda más chico y abajo (contexto del proyecto, no el foco) */}
        <div className={esDashboardOperativo ? "grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6" : "grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6"}>
          <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-7 flex flex-col items-center justify-center shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_20px_50px_-24px_rgba(0,0,0,0.65)]">
            <PortalProgress porcentaje={porcentaje} completadas={completadas} total={tasks.length} />
          </div>

          <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-6 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_20px_50px_-24px_rgba(0,0,0,0.65)]">
            <SectionLabel>Tareas</SectionLabel>
            <PortalTaskList tasks={tasks} />
          </div>
        </div>

        {/* Timeline */}
        {updates.length > 0 ? (
          <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-6 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_20px_50px_-24px_rgba(0,0,0,0.65)]">
            <SectionLabel count={updates.length}>Actualizaciones</SectionLabel>
            <PortalTimeline updates={updates} />
          </div>
        ) : (
          <div className="rounded-2xl py-10 text-center border border-dashed border-white/[0.06]">
            <p className="text-[11px] uppercase tracking-widest text-white/20">
              Las actualizaciones del proyecto aparecerán aquí
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] px-6 py-10 mt-12">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <Image
            src="/brand/meteoro-logo-nuevo.png"
            alt="meteoro."
            width={281}
            height={89}
            className="h-5 w-auto object-contain opacity-40"
          />
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/15">
            Portal privado · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
