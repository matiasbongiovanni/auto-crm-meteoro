"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EcommerceMetricas } from "@/types/portal";

const CARD = "rounded-2xl bg-white/[0.02] border border-white/8 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_20px_50px_-24px_rgba(0,0,0,0.65)]";

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

function formatLong(dia: string) {
  return new Date(dia + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

type Props = { metricas: EcommerceMetricas; moneda?: string };

export function PortalMetricasDiarias({ metricas, moneda = "ARS" }: Props) {
  const dias = useMemo(
    () => Array.from(new Set(metricas.carritos.map((c) => c.dia))).sort((a, b) => b.localeCompare(a)),
    [metricas.carritos]
  );

  const [idx, setIdx] = useState(0);
  const diaActual = dias[idx];

  if (dias.length === 0) return null;

  const carritosDia = metricas.carritos.find((c) => c.dia === diaActual) ?? null;
  const enviosDia = metricas.envios.filter((e) => e.dia === diaActual);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="w-1 h-3 rounded-full bg-white/25" />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
          Métricas diarias
        </h2>
      </div>

      <div className={`${CARD} p-6`}>
        {/* Navegación de día */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => setIdx((i) => Math.min(i + 1, dias.length - 1))}
            disabled={idx >= dias.length - 1}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/25 disabled:opacity-20 disabled:hover:text-white/50 disabled:hover:border-white/10 transition-colors"
            aria-label="Día anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold text-white capitalize">{formatLong(diaActual)}</p>
            <select
              value={diaActual}
              onChange={(e) => setIdx(dias.indexOf(e.target.value))}
              className="mt-1 bg-transparent text-[10px] text-white/30 uppercase tracking-wider text-center border-none outline-none cursor-pointer"
            >
              {dias.map((d) => (
                <option key={d} value={d} className="bg-[#0a0a0c] text-white">
                  {d}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIdx((i) => Math.max(i - 1, 0))}
            disabled={idx <= 0}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/25 disabled:opacity-20 disabled:hover:text-white/50 disabled:hover:border-white/10 transition-colors"
            aria-label="Día siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Stats del día */}
        {carritosDia ? (
          <div className="flex flex-wrap gap-x-10 gap-y-5 mb-6">
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Carritos abandonados</p>
              <p className="text-2xl font-bold text-white tabular-nums">{carritosDia.carritos}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Recuperados por WhatsApp</p>
              <p className="text-2xl font-bold text-emerald-400/90 tabular-nums">{carritosDia.recuperados_campana}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Recuperados orgánicos</p>
              <p className="text-2xl font-bold text-white tabular-nums">{carritosDia.recuperados_organico}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Monto recuperado</p>
              <p className="text-2xl font-bold text-white tabular-nums">{moneda} {formatMoney(carritosDia.monto_recuperado_campana)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Monto abandonado</p>
              <p className="text-2xl font-bold text-white tabular-nums">{moneda} {formatMoney(carritosDia.monto_abandonado)}</p>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-white/25 mb-6">Sin carritos registrados este día.</p>
        )}

        {/* Envíos del día */}
        {enviosDia.length > 0 && (
          <div className="border-t border-white/[0.06] pt-5 mt-5">
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-3">Envíos</p>
            <div className="space-y-2">
              {enviosDia.map((e, i) => (
                <div key={`${e.courier}-${i}`} className="flex items-center justify-between text-xs">
                  <span className="text-white/70 capitalize">{e.courier || "sin courier"}</span>
                  <span className="text-white/40 tabular-nums">
                    {e.entregados}/{e.pedidos} entregados
                    {e.intentos_fallidos > 0 && <span className="text-red-400/60 ml-2">{e.intentos_fallidos} fallidos</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
