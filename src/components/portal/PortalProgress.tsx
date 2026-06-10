type Props = {
  porcentaje: number;
  completadas: number;
  total: number;
};

export function PortalProgress({ porcentaje, completadas, total }: Props) {
  const r = 60;
  const circ = 2 * Math.PI * r;
  const offset = circ - (porcentaje / 100) * circ;

  // Posición del punto cabeza al final del arco
  const angle = (porcentaje / 100) * 2 * Math.PI - Math.PI / 2;
  const dotX = 76 + r * Math.cos(angle);
  const dotY = 76 + r * Math.sin(angle);

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <div className="relative" style={{ width: 152, height: 152 }}>
        <svg width="152" height="152" viewBox="0 0 152 152"
          style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <defs>
            <filter id="head-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Track */}
          <circle cx="76" cy="76" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
          {/* Arc */}
          <circle cx="76" cy="76" r={r} fill="none" stroke="white" strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)" }}
          />
          {/* Cabeza del arco */}
          {porcentaje > 2 && (
            <circle cx={dotX} cy={dotY} r="5.5" fill="white" filter="url(#head-glow)" />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white leading-none tabular-nums">{porcentaje}</span>
          <span className="text-xs text-white/30 mt-0.5 font-light">%</span>
        </div>
      </div>

      <div className="w-full space-y-1.5">
        <div className="h-px bg-white/8 overflow-hidden">
          <div className="h-full bg-white transition-all duration-700" style={{ width: `${porcentaje}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-white/25">
          <span>{completadas} completada{completadas !== 1 ? "s" : ""}</span>
          <span>{total - completadas} restante{total - completadas !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}
