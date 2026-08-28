import type { PedidosEstadoMetricas } from "@/types/portal";

const CARD = "rounded-2xl bg-white/[0.02] border border-white/8 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_20px_50px_-24px_rgba(0,0,0,0.65)]";

function formatShort(dia: string) {
  return new Date(dia + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
}

type Props = { metricas: PedidosEstadoMetricas };

export function PortalMetricasPedidos({ metricas }: Props) {
  const { dias, totales } = metricas;
  const total = totales.confirmados + totales.reprogramados + totales.cancelados + totales.sin_accion;
  const pctConfirmados = pct(totales.confirmados, total);
  const pctFriccion = pct(totales.cancelados + totales.reprogramados, total);
  const maxDia = Math.max(1, ...dias.map((d) => d.confirmados + d.reprogramados + d.cancelados + d.sin_accion));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="w-1 h-3 rounded-full bg-white/25" />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
          Métricas · Confirmación de pedidos por WhatsApp
        </h2>
      </div>

      {/* Porcentajes principales */}
      <div className={`${CARD} p-7 md:p-8`}>
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/30 font-semibold">Resultado de la encuesta post-checkout</p>
          <p className="text-[11px] text-white/25">{total} pedido{total === 1 ? "" : "s"} en el período</p>
        </div>

        <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
          <div>
            <p className="text-4xl md:text-5xl font-bold text-emerald-400/90 tabular-nums tracking-tight">
              {pctConfirmados}%
            </p>
            <p className="text-xs text-white/35 mt-2">
              confirmados ({totales.confirmados} pedido{totales.confirmados === 1 ? "" : "s"})
            </p>
          </div>
          <div className="h-12 w-px bg-white/[0.06] hidden md:block" />
          <div>
            <p className="text-4xl md:text-5xl font-bold text-amber-400/90 tabular-nums tracking-tight">
              {pctFriccion}%
            </p>
            <p className="text-xs text-white/35 mt-2">
              cancelados + reprogramados ({totales.cancelados + totales.reprogramados} pedido{totales.cancelados + totales.reprogramados === 1 ? "" : "s"})
            </p>
          </div>
        </div>

        {/* Barra apilada por estado */}
        <div className="mt-8">
          <div className="flex h-2 rounded-full overflow-hidden border border-white/[0.06]">
            <div className="bg-emerald-400/80" style={{ width: `${pct(totales.confirmados, total)}%` }} />
            <div className="bg-amber-400/80" style={{ width: `${pct(totales.reprogramados, total)}%` }} />
            <div className="bg-rose-400/80" style={{ width: `${pct(totales.cancelados, total)}%` }} />
            <div className="bg-white/15" style={{ width: `${pct(totales.sin_accion, total)}%` }} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-[11px] text-white/30">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-400/80 inline-block" /> Confirmados</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-400/80 inline-block" /> Reprogramados</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-rose-400/80 inline-block" /> Cancelados</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white/15 inline-block" /> Sin acción</span>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className={`${CARD} p-7`}>
        <div className="flex flex-wrap gap-x-10 gap-y-5">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Confirmados</p>
            <p className="text-2xl font-bold text-white tabular-nums">{totales.confirmados}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Reprogramados</p>
            <p className="text-2xl font-bold text-white tabular-nums">{totales.reprogramados}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Cancelados</p>
            <p className="text-2xl font-bold text-white tabular-nums">{totales.cancelados}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Sin acción</p>
            <p className="text-2xl font-bold text-white tabular-nums">{totales.sin_accion}</p>
          </div>
        </div>
      </div>

      {/* Evolución diaria */}
      {dias.length > 0 && (
        <div className={`${CARD} p-6`}>
          <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-5">Evolución diaria</p>
          <div className="flex items-end gap-1.5 h-32">
            {dias.map((d) => {
              const totalDia = d.confirmados + d.reprogramados + d.cancelados + d.sin_accion;
              return (
                <div key={d.dia} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                  <div className="w-full flex flex-col justify-end" style={{ height: 96 }}>
                    <div
                      className="w-full rounded-t-sm relative overflow-hidden flex flex-col-reverse"
                      style={{ height: `${Math.max(4, (totalDia / maxDia) * 96)}px` }}
                    >
                      <div className="w-full bg-white/15" style={{ height: `${totalDia > 0 ? (d.sin_accion / totalDia) * 100 : 0}%` }} />
                      <div className="w-full bg-rose-400/80" style={{ height: `${totalDia > 0 ? (d.cancelados / totalDia) * 100 : 0}%` }} />
                      <div className="w-full bg-amber-400/80" style={{ height: `${totalDia > 0 ? (d.reprogramados / totalDia) * 100 : 0}%` }} />
                      <div className="w-full bg-emerald-400/80" style={{ height: `${totalDia > 0 ? (d.confirmados / totalDia) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <span className="text-[8px] text-white/20 tabular-nums">{formatShort(d.dia)}</span>
                  <div className="absolute -top-14 hidden group-hover:block bg-black border border-white/15 rounded px-2 py-1 text-[9px] text-white/80 whitespace-nowrap z-10">
                    {d.confirmados} confirmados · {d.reprogramados} reprog. · {d.cancelados} cancel. · {d.sin_accion} sin acción
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="rounded-2xl py-10 text-center border border-dashed border-white/[0.06]">
          <p className="text-[11px] uppercase tracking-widest text-white/20">
            Todavía no hay datos en el período seleccionado
          </p>
        </div>
      )}

      <p className="text-[10px] text-white/15 leading-relaxed max-w-2xl">
        &quot;Sin acción&quot; son pedidos que todavía no confirmaron, cancelaron ni reprogramaron a través de la encuesta de WhatsApp — pueden estar dentro de la ventana de espera o haber quedado sin resolución.
      </p>
    </div>
  );
}
