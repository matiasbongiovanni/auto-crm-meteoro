import type { EcommerceMetricas } from "@/types/portal";

const CARD = "rounded-2xl bg-white/[0.02] border border-white/8 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_20px_50px_-24px_rgba(0,0,0,0.65)]";

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

function formatShort(dia: string) {
  return new Date(dia + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function sum<T>(arr: T[], pick: (x: T) => number) {
  return arr.reduce((acc, x) => acc + pick(x), 0);
}

type Props = { metricas: EcommerceMetricas; moneda?: string; plantillasCampana: string[] };

export function PortalMetricas({ metricas, moneda = "ARS", plantillasCampana }: Props) {
  const { carritos, envios, mensajes } = metricas;

  const totalCarritos = sum(carritos, (c) => c.carritos);
  const totalRecuperadosCampana = sum(carritos, (c) => c.recuperados_campana);
  const totalRecuperadosOrganico = sum(carritos, (c) => c.recuperados_organico);
  const totalRecuperadosBruto = totalRecuperadosCampana + totalRecuperadosOrganico;
  // El set de plantillas acá tiene que ser EXACTO al que usa recuperado_por_campana
  // en v_metricas_carritos (ver salidas/workflows/<cliente>/*.sql) — si no, numerador
  // y denominador miden poblaciones distintas y la tasa queda mentirosa.
  const mensajesCarritoEnviados = sum(
    mensajes.filter((m) => plantillasCampana.includes(m.plantilla_key)),
    (m) => m.enviados
  );
  const tasaConversion =
    mensajesCarritoEnviados > 0 ? Math.round((totalRecuperadosCampana / mensajesCarritoEnviados) * 1000) / 10 : 0;
  const ventasRecuperadas = sum(carritos, (c) => c.monto_recuperado_campana);
  const montoAbandonado = sum(carritos, (c) => c.monto_abandonado);
  const totalEnviados = sum(mensajes, (m) => m.enviados);
  const totalErrores = sum(mensajes, (m) => m.errores);

  const enviosPorCourier = envios.reduce<Record<string, { pedidos: number; entregados: number; fallidos: number }>>((acc, e) => {
    const k = e.courier || "sin courier";
    if (!acc[k]) acc[k] = { pedidos: 0, entregados: 0, fallidos: 0 };
    acc[k].pedidos += e.pedidos;
    acc[k].entregados += e.entregados;
    acc[k].fallidos += e.intentos_fallidos;
    return acc;
  }, {});

  const maxCarritos = Math.max(1, ...carritos.map((c) => c.carritos));
  const pctReal = totalRecuperadosBruto > 0 ? (totalRecuperadosCampana / totalRecuperadosBruto) * 100 : 0;

  const catLabel: Record<string, string> = { UTILITY: "Utility", MARKETING: "Marketing" };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="w-1 h-3 rounded-full bg-white/25" />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
          Métricas · Recuperación de carritos por WhatsApp
        </h2>
      </div>

      {/* Ventas recuperadas + conversión — panel principal */}
      <div className={`${CARD} p-7 md:p-8`}>
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/30 font-semibold">Ventas recuperadas por WhatsApp</p>
          <p className="text-[11px] text-white/25">{totalCarritos} carritos abandonados en el período</p>
        </div>

        <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
          <div>
            <p className="text-4xl md:text-5xl font-bold text-white tabular-nums tracking-tight">
              {moneda} {formatMoney(ventasRecuperadas)}
            </p>
            <p className="text-xs text-white/35 mt-2">
              {totalRecuperadosCampana} venta{totalRecuperadosCampana === 1 ? "" : "s"} atribuible{totalRecuperadosCampana === 1 ? "" : "s"} al mensaje de WhatsApp
            </p>
          </div>
          <div className="h-12 w-px bg-white/[0.06] hidden md:block" />
          <div>
            <p className="text-4xl md:text-5xl font-bold text-emerald-400/90 tabular-nums tracking-tight">
              {tasaConversion}%
            </p>
            <p className="text-xs text-white/35 mt-2">tasa de conversión (recuperados / mensajes de recuperación enviados)</p>
          </div>
        </div>

        {/* Barra real vs orgánico */}
        <div className="mt-8">
          <div className="flex h-2 rounded-full overflow-hidden border border-white/[0.06]">
            <div className="bg-emerald-400/80" style={{ width: `${pctReal}%` }} />
            <div className="bg-white/15" style={{ width: `${100 - pctReal}%` }} />
          </div>
          <div className="flex items-center justify-between mt-3 text-[11px] text-white/30">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-emerald-400/80 inline-block" />
              {totalRecuperadosCampana} por WhatsApp
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-white/15 inline-block" />
              {totalRecuperadosOrganico} orgánicos (compraron antes del mensaje)
            </span>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className={`${CARD} p-7`}>
        <div className="flex flex-wrap gap-x-10 gap-y-5">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Carritos abandonados</p>
            <p className="text-2xl font-bold text-white tabular-nums">{totalCarritos}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Recuperados por WhatsApp</p>
            <p className="text-2xl font-bold text-white tabular-nums">{totalRecuperadosCampana}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Tasa de conversión</p>
            <p className="text-2xl font-bold text-white tabular-nums">{tasaConversion}%</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Monto abandonado</p>
            <p className="text-2xl font-bold text-white tabular-nums">{moneda} {formatMoney(montoAbandonado)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1">Mensajes enviados</p>
            <p className="text-2xl font-bold text-white tabular-nums">
              {totalEnviados}
              {totalErrores > 0 && <span className="text-red-400/70 font-light text-base ml-1">({totalErrores} err)</span>}
            </p>
            <p className="text-[9px] text-white/20 mt-1">(sumando confirmaciones de compra y envío)</p>
          </div>
        </div>
      </div>

      {/* Evolución diaria */}
      {carritos.length > 0 && (
        <div className={`${CARD} p-6`}>
          <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-5">Evolución diaria</p>
          <div className="flex items-end gap-1.5 h-32">
            {carritos.map((c) => (
              <div key={c.dia} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                <div className="w-full flex flex-col justify-end" style={{ height: 96 }}>
                  <div
                    className="w-full bg-white/10 rounded-t-sm relative overflow-hidden flex flex-col-reverse"
                    style={{ height: `${Math.max(4, (c.carritos / maxCarritos) * 96)}px` }}
                  >
                    <div
                      className="w-full bg-white/15"
                      style={{ height: `${c.carritos > 0 ? (c.recuperados_organico / c.carritos) * 100 : 0}%` }}
                    />
                    <div
                      className="w-full bg-emerald-400/80"
                      style={{ height: `${c.carritos > 0 ? (c.recuperados_campana / c.carritos) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <span className="text-[8px] text-white/20 tabular-nums">{formatShort(c.dia)}</span>
                <div className="absolute -top-10 hidden group-hover:block bg-black border border-white/15 rounded px-2 py-1 text-[9px] text-white/80 whitespace-nowrap z-10">
                  {c.carritos} carritos · {c.recuperados_campana} por WhatsApp · {c.recuperados_organico} orgánicos
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-[9px] text-white/25 uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white/10 inline-block" /> Abandonados</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white/15 inline-block" /> Recuperados orgánicos</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-400/80 inline-block" /> Recuperados por WhatsApp</span>
          </div>
        </div>
      )}

      {/* Plantillas enviadas */}
      {mensajes.length > 0 && (
        <div className={`${CARD} p-6`}>
          <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-5">Mensajes de WhatsApp por plantilla</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] uppercase tracking-[0.1em] text-white/25">
                  <th className="text-left font-semibold pb-3 pr-4">Plantilla</th>
                  <th className="text-left font-semibold pb-3 pr-4">Categoría</th>
                  <th className="text-right font-semibold pb-3 pr-4">Enviados</th>
                  <th className="text-right font-semibold pb-3 pr-4">Pendientes</th>
                  <th className="text-right font-semibold pb-3">Errores</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(
                  mensajes.reduce<Record<string, { key: string; categoria: string; enviados: number; pendientes: number; errores: number }>>((acc, m) => {
                    if (!acc[m.plantilla_key]) acc[m.plantilla_key] = { key: m.plantilla_key, categoria: m.categoria, enviados: 0, pendientes: 0, errores: 0 };
                    acc[m.plantilla_key].enviados += m.enviados;
                    acc[m.plantilla_key].pendientes += m.pendientes;
                    acc[m.plantilla_key].errores += m.errores;
                    return acc;
                  }, {})
                )
                  .sort((a, b) => b.enviados - a.enviados)
                  .map((row) => (
                    <tr key={row.key} className="border-t border-white/[0.05]">
                      <td className="py-3 pr-4 text-white/70 font-mono">{row.key}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide ${
                          row.categoria === "MARKETING" ? "bg-amber-400/10 text-amber-300/80" : "bg-emerald-400/10 text-emerald-300/80"
                        }`}>
                          {catLabel[row.categoria] || row.categoria}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right text-white/80 tabular-nums">{row.enviados}</td>
                      <td className="py-3 pr-4 text-right text-white/30 tabular-nums">{row.pendientes}</td>
                      <td className={`py-3 text-right tabular-nums ${row.errores > 0 ? "text-red-400/80" : "text-white/30"}`}>{row.errores}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Envíos por courier */}
      {Object.keys(enviosPorCourier).length > 0 && (
        <div className={`${CARD} p-6`}>
          <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 mb-5">Envíos por courier</p>
          <div className="space-y-3">
            {Object.entries(enviosPorCourier).map(([courier, d]) => (
              <div key={courier} className="flex items-center justify-between text-xs">
                <span className="text-white/70 capitalize">{courier}</span>
                <span className="text-white/40 tabular-nums">
                  {d.entregados}/{d.pedidos} entregados
                  {d.fallidos > 0 && <span className="text-red-400/60 ml-2">{d.fallidos} fallidos</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {carritos.length === 0 && envios.length === 0 && mensajes.length === 0 && (
        <div className="rounded-2xl py-10 text-center border border-dashed border-white/[0.06]">
          <p className="text-[11px] uppercase tracking-widest text-white/20">
            Todavía no hay datos en el período seleccionado
          </p>
        </div>
      )}

      <p className="text-[10px] text-white/15 leading-relaxed max-w-2xl">
        Un carrito cuenta como recuperado &quot;por WhatsApp&quot; solo si el mensaje de recordatorio salió antes de que se completara la compra. Las compras que llegan antes de que el mensaje salga se cuentan aparte como orgánicas, no como mérito de la campaña.
      </p>
    </div>
  );
}
