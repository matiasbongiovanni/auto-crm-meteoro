"use client";

import { useEffect, useState } from "react";
import { Banknote } from "lucide-react";

type Cotizacion = { label: string; venta: number | null; loading: boolean };

const FUENTES: { key: string; label: string }[] = [
  { key: "blue", label: "Dólar blue" },
  { key: "oficial", label: "Dólar oficial" },
  { key: "crypto", label: "Cripto" },
  { key: "eur", label: "Euro" },
];

const REFRESH_MS = 60_000;

function formatARS(value: number): string {
  return value.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export function DolarWidget() {
  const [cotizaciones, setCotizaciones] = useState<Record<string, Cotizacion>>(
    Object.fromEntries(FUENTES.map((f) => [f.key, { label: f.label, venta: null, loading: true }]))
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      const results = await Promise.all(
        FUENTES.map(async (f) => {
          try {
            const res = await fetch(`/api/exchange?type=${f.key}`);
            const data = await res.json();
            return [f.key, { label: f.label, venta: data.ok ? data.venta : null, loading: false }] as const;
          } catch {
            return [f.key, { label: f.label, venta: null, loading: false }] as const;
          }
        })
      );
      if (!cancelled) setCotizaciones(Object.fromEntries(results));
    }

    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="glow-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground/90 truncate">Cotizaciones</p>
          <p className="text-[11px] text-muted-foreground truncate">Dolarapi · actualiza cada 1 min</p>
        </div>
        <Banknote className="size-4 text-muted-foreground shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {FUENTES.map((f) => {
          const c = cotizaciones[f.key];
          return (
            <div key={f.key} className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground">{c.label}</span>
              <span className="text-[15px] font-bold tracking-[-0.02em] text-foreground leading-none">
                {c.loading ? "···" : c.venta !== null ? `$${formatARS(c.venta)}` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
