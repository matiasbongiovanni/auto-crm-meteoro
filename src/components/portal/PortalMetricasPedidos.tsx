"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PedidosEstadoMetricas } from "@/types/portal";

const CARD = "rounded-2xl bg-white/[0.02] border border-white/8 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_20px_50px_-24px_rgba(0,0,0,0.65)]";

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
}

function formatLong(dia: string) {
  return new Date(dia + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

type Props = { metricas: PedidosEstadoMetricas };

export function PortalMetricasPedidos({ metricas }: Props) {
  const { dias } = metricas;
  const [indice, setIndice] = useState(dias.length - 1); // último día = hoy

  const dia = dias[indice];
  const activo = dia ?? { confirmados: 0, reprogramados: 0, cancelados: 0, sin_accion: 0, canal_web: 0, canal_whatsapp: 0, canal_automatico: 0 };
  const total = activo.confirmados + activo.reprogramados + activo.cancelados + activo.sin_accion;
  const accionesReales = activo.canal_web + activo.canal_whatsapp; // excluye automático y sin_accion — solo acciones donde alguien tocó algo
  const pctConfirmados = pct(activo.confirmados, total);
  const pctFriccion = pct(activo.cancelados + activo.reprogramados, total);
  const pctCanalWeb = pct(activo.canal_web, accionesReales);
  const pctCanalWhatsapp = pct(activo.canal_whatsapp, accionesReales);
  const pctNoInteractua = pct(activo.canal_automatico + activo.sin_accion, total);

  const esHoy = indice === dias.length - 1;
  const puedeAtras = indice > 0;
  const puedeAdelante = indice < dias.length - 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-1 h-3 rounded-full bg-white/25" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
            Métricas · Confirmación de pedidos por WhatsApp
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIndice((i) => Math.max(0, i - 1))}
            disabled={!puedeAtras}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 text-white/50 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/[0.04] hover:text-white/80 transition-colors"
            aria-label="Día anterior"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-[11px] text-white/50 capitalize min-w-[9rem] text-center">
            {dia ? (esHoy ? "Hoy" : formatLong(dia.dia)) : "—"}
          </span>
          <button
            type="button"
            onClick={() => setIndice((i) => Math.min(dias.length - 1, i + 1))}
            disabled={!puedeAdelante}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 text-white/50 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/[0.04] hover:text-white/80 transition-colors"
            aria-label="Día siguiente"
          >
            <ChevronRight size={14} />
          </button>
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
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Sin acción (pendiente)</p>
            <p className="text-2xl font-bold text-white tabular-nums">{activo.sin_accion}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Friccion (cancel. + reprog.)</p>
            <p className="text-2xl font-bold text-amber-400/90 tabular-nums">{pctFriccion}%</p>
          </div>
        </div>
      </div>

      {/* Canal de la respuesta: acá se ve si tocan el botón de la web o responden por WhatsApp */}
      <div className={`${CARD} p-7`}>
        <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-4">Canal de la respuesta (de los que sí interactuaron)</p>
        <div className="flex flex-wrap gap-x-10 gap-y-5">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Botón página web</p>
            <p className="text-2xl font-bold text-white tabular-nums">{activo.canal_web} <span className="text-xs font-normal text-white/30">({pctCanalWeb}%)</span></p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Encuesta WhatsApp</p>
            <p className="text-2xl font-bold text-white tabular-nums">{activo.canal_whatsapp} <span className="text-xs font-normal text-white/30">({pctCanalWhatsapp}%)</span></p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">No tocó nada (auto-cancelado o pendiente)</p>
            <p className="text-2xl font-bold text-red-400/90 tabular-nums">{pctNoInteractua}%</p>
          </div>
        </div>
      </div>

      {total === 0 && (
        <div className="rounded-2xl py-10 text-center border border-dashed border-white/[0.06]">
          <p className="text-[11px] uppercase tracking-widest text-white/20">
            Todavía no hay datos {esHoy ? "hoy" : "ese día"}
          </p>
        </div>
      )}

      <p className="text-[10px] text-white/15 leading-relaxed max-w-2xl">
        &quot;Botón página web&quot; son clics reales en la página post-checkout. &quot;Encuesta WhatsApp&quot; son respuestas al mensaje de WhatsApp de los 5/65/125 minutos. &quot;No tocó nada&quot; son pedidos que el sistema canceló solo por timeout o que todavía están dentro de la ventana de espera — no hubo ninguna interacción real del cliente.
      </p>
    </div>
  );
}
