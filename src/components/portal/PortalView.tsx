import Image from "next/image";
import { PortalProgress } from "./PortalProgress";
import { PortalTaskList } from "./PortalTaskList";
import { PortalTimeline } from "./PortalTimeline";
import { PortalMetricas } from "./PortalMetricas";
import type { PortalProject, PortalTask, PortalUser, EcommerceMetricas } from "@/types/portal";

const BOLT = "M18 4L9 17H15.5L10 28L23 15H16L21 4Z";

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
};

export function PortalView({ project, portalUser, metricas }: Props) {
  const tasks = project.tasks ?? [];
  const updates = project.updates ?? [];
  const completadas = tasks.filter((t: PortalTask) => t.status === "completada").length;
  const enProgreso = tasks.filter((t: PortalTask) => t.status === "en_progreso").length;
  const porcentaje = project.porcentaje_calculado;
  const dias = project.fecha_estimada ? diasRestantes(project.fecha_estimada) : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* Barra de progreso top */}
      <div className="h-px w-full bg-white/5">
        <div className="h-full bg-white transition-all duration-1000" style={{ width: `${porcentaje}%` }} />
      </div>

      {/* Header */}
      <header className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/meteoro-isotipo.svg"
              alt=""
              width={28}
              height={28}
              className="opacity-90"
            />
            <div className="h-4 w-px bg-white/10" />
            <Image
              src="/brand/meteoro-negativo.png"
              alt="meteoro."
              width={80}
              height={20}
              className="h-[18px] w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">{portalUser.nombre}</span>
            <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[11px] font-bold text-white/70 uppercase">
              {portalUser.nombre.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/8 p-8">
          {/* Bolt watermark */}
          <svg viewBox="0 0 32 32" fill="none" aria-hidden
            className="absolute right-0 top-0 opacity-[0.03] pointer-events-none"
            style={{ width: 320, height: 320, transform: "translate(20%, -10%)" }}>
            <path d={BOLT} fill="white" />
          </svg>

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
            </div>
          </div>
        </div>

        {/* Progreso + Tareas */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-7 flex flex-col items-center justify-center">
            <PortalProgress porcentaje={porcentaje} completadas={completadas} total={tasks.length} />
          </div>

          <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-6">
            <div className="flex items-center gap-2 mb-5">
              <svg viewBox="0 0 32 32" fill="none" aria-hidden style={{ width: 12, height: 12, opacity: 0.35 }}>
                <path d={BOLT} fill="white" />
              </svg>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
                Tareas
              </h2>
            </div>
            <PortalTaskList tasks={tasks} />
          </div>
        </div>

        {/* Métricas ecommerce (solo si el proyecto tiene fuente configurada) */}
        {metricas && <PortalMetricas metricas={metricas} />}

        {/* Timeline */}
        {updates.length > 0 ? (
          <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-6">
            <div className="flex items-center gap-2 mb-6">
              <svg viewBox="0 0 32 32" fill="none" aria-hidden style={{ width: 12, height: 12, opacity: 0.35 }}>
                <path d={BOLT} fill="white" />
              </svg>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
                Actualizaciones
              </h2>
              <span className="ml-auto text-[10px] text-white/20 tabular-nums">{updates.length}</span>
            </div>
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
      <footer className="border-t border-white/[0.04] px-6 py-8 mt-12">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2.5">
            <Image src="/brand/meteoro-isotipo.svg" alt="" width={18} height={18} className="opacity-40" />
            <Image src="/brand/meteoro-negativo.png" alt="meteoro." width={60} height={16} className="h-3.5 w-auto opacity-30" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/15">
            Portal privado · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
