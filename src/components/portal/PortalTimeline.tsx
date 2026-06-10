import type { PortalUpdate, PortalUpdateType } from "@/types/portal";

const TYPE_CONFIG: Record<PortalUpdateType, { label: string; dot: string }> = {
  hito:    { label: "Hito",    dot: "bg-white" },
  entrega: { label: "Entrega", dot: "bg-white" },
  avance:  { label: "Avance",  dot: "bg-white/50" },
  nota:    { label: "Nota",    dot: "bg-white/20" },
};

function formatFecha(fecha: string) {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

export function PortalTimeline({ updates }: { updates: PortalUpdate[] }) {
  if (updates.length === 0) {
    return <p className="text-xs text-white/20 py-6 text-center">Sin actualizaciones aún.</p>;
  }

  return (
    <div className="relative pl-5">
      <div className="absolute left-[5px] top-2 bottom-2 w-px bg-white/8" />
      <div className="space-y-5">
        {updates.map((u) => {
          const cfg = TYPE_CONFIG[u.tipo] ?? TYPE_CONFIG.avance;
          const isHito = u.tipo === "hito" || u.tipo === "entrega";
          return (
            <div key={u.id} className="relative flex gap-4">
              <div className={`absolute -left-5 w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${cfg.dot}`}
                style={{ outline: "3px solid #0a0a0a" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[9px] font-bold uppercase tracking-[0.15em] ${isHito ? "text-white" : "text-white/40"}`}>
                    {cfg.label}
                  </span>
                  <span className="text-[10px] text-white/25">{formatFecha(u.fecha)}</span>
                </div>
                <p className={`text-sm leading-relaxed ${isHito ? "text-white/80 font-medium" : "text-white/55"}`}>
                  {u.mensaje}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
