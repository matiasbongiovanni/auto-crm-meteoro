"use client";

import { useMemo, useState } from "react";
import type { PedidosEstadoDia, PedidosEstadoMetricas } from "@/types/portal";

const CARD = "rounded-2xl bg-white/[0.02] border border-white/8 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_20px_50px_-24px_rgba(0,0,0,0.65)]";

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
}

function formatShort(dia: string) {
  return new Date(dia + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function formatLong(dia: string) {
  return new Date(dia + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

function totalDia(d: PedidosEstadoDia) {
  return d.confirmados + d.reprogramados + d.cancelados + d.sin_accion;
}

type Props = { metricas: PedidosEstadoMetricas };

export function PortalMetricasPedidos({ metricas }: Props) {
  const { dias } = metricas;
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null); // null = período completo

  const activo = useMemo(() => {
    if (!diaSeleccionado) {
      return dias.reduce(
        (acc, d) => ({
          confirmados: acc.confirmados + d.confirmados,
          reprogramados: acc.reprogramados + d.reprogramados,
          cancelados: acc.cancelados + d.cancelados,
          sin_accion: acc.sin_accion + d.sin_accion,
        }),
        { confirmados: 0, reprogramados: 0, cancelados: 0, sin_accion: 0 }
      );
    }
    const d = dias.find((x) => x.dia === diaSeleccionado);
    return d ?? { confirmados: 0, reprogramados: 0, cancelados: 0, sin_accion: 0 };
  }, [dias, diaSeleccionado]);

  const total = activo.confirmados + activo.reprogramados + activo.cancelados + activo.sin_accion;
  const pctConfirmados = pct(activo.confirmados, total);
  const pctFriccion = pct(activo.cancelados + activo.reprogramados, total);
  const maxTotal = Math.max(1, ...dias.map(totalDia));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-1 h-3 rounded-full bg-white/25" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
            Métricas · Confirmación de pedidos por WhatsApp
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/25">
            {diaSeleccionado ? formatLong(diaSeleccionado) : `Últimos ${dias.length} días`}
          </span>
          <select
            value={diaSeleccionado ?? ""}
            onChange={(e) => setDiaSeleccionado(e.target.value || null)}
            className="bg-white/[0.03] border border-white/10 rounded-lg text-[11px] text-white/70 px-2.5 py-1.5 outline-none focus:border-white/25"
          >
            <option value="">Todo el período</option>
            {[...dias].reverse().map((d) => (
              <option key={d.dia} value={d.dia}>{formatShort(d.dia)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stat tiles */}
      <div className={`${CARD} p-7`}>
        <div className="flex flex-wrap gap-x-10 gap-y-5">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Confirmados</p>
            <p className="text-2xl font-bold text-white tabular-nums">{activo.confirmados} <span className="text-xs font-normal text-white/30">({pctConfirmados}%)</span></p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Reprogramados</p>
            <p className="text-2xl font-bold text-white tabular-nums">{activo.reprogramados}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Cancelados</p>
            <p className="text-2xl font-bold text-white tabular-nums">{activo.cancelados}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Sin acción</p>
            <p className="text-2xl font-bold text-white tabular-nums">{activo.sin_accion}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Friccion (cancel. + reprog.)</p>
            <p className="text-2xl font-bold text-amber-400/90 tabular-nums">{pctFriccion}%</p>
          </div>
        </div>
      </div>

      {/* Evolución diaria */}
      {dias.some((d) => totalDia(d) > 0) && (
        <div className={`${CARD} p-6`}>
          <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-5">Evolución diaria</p>
          <div className="flex items-end gap-1 h-32 overflow-x-auto">
            {dias.map((d) => {
              const t = totalDia(d);
              const seleccionado = d.dia === diaSeleccionado;
              return (
                <button
                  key={d.dia}
                  type="button"
                  onClick={() => setDiaSeleccionado(seleccionado ? null : d.dia)}
                  className="flex-1 min-w-[8px] flex flex-col items-center justify-end gap-1 group relative cursor-pointer"
                >
                  <div className="w-full flex flex-col justify-end" style={{ height: 96 }}>
                    <div
                      className={`w-full rounded-t-sm relative overflow-hidden flex flex-col-reverse transition-opacity ${seleccionado ? "opacity-100" : "opacity-80 group-hover:opacity-100"}`}
                      style={{ height: `${Math.max(t > 0 ? 4 : 1, (t / maxTotal) * 96)}px` }}
                    >
                      <div className="w-full bg-white/10" style={{ height: `${t > 0 ? (d.sin_accion / t) * 100 : 0}%` }} />
                      <div className="w-full bg-amber-400/70" style={{ height: `${t > 0 ? ((d.cancelados + d.reprogramados) / t) * 100 : 0}%` }} />
                      <div className="w-full bg-emerald-400/80" style={{ height: `${t > 0 ? (d.confirmados / t) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <span className={`text-[8px] tabular-nums ${seleccionado ? "text-white/70" : "text-white/20"}`}>
                    {formatShort(d.dia)}
                  </span>
                  <div className="absolute -top-10 hidden group-hover:block bg-black border border-white/15 rounded px-2 py-1 text-[9px] text-white/80 whitespace-nowrap z-10">
                    {d.confirmados} conf. · {d.reprogramados} repr. · {d.cancelados} canc. · {d.sin_accion} s/acción
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-[9px] text-white/25 uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-400/80 inline-block" /> Confirmados</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-400/70 inline-block" /> Cancel. + reprog.</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white/10 inline-block" /> Sin acción</span>
          </div>
          <p className="text-[9px] text-white/15 mt-3">Tocá una barra para ver el detalle de ese día.</p>
        </div>
      )}

      {total === 0 && (
        <div className="rounded-2xl py-10 text-center border border-dashed border-white/[0.06]">
          <p className="text-[11px] uppercase tracking-widest text-white/20">
            Todavía no hay datos {diaSeleccionado ? "para ese día" : "en el período"}
          </p>
        </div>
      )}

      <p className="text-[10px] text-white/15 leading-relaxed max-w-2xl">
        &quot;Sin acción&quot; son pedidos que todavía no confirmaron, cancelaron ni reprogramaron a través de la encuesta de WhatsApp — pueden estar dentro de la ventana de espera o haber quedado sin resolución. Los cancelados no llevan fecha en la planilla, así que no se pueden ubicar en ningún día y no entran en este reporte.
      </p>
    </div>
  );
}
