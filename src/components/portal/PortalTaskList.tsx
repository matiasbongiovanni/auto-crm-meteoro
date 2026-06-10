import type { PortalTask, PortalTaskCategory } from "@/types/portal";

const CATEGORY_LABELS: Record<PortalTaskCategory, string> = {
  diseno: "Diseño", desarrollo: "Desarrollo", contenido: "Contenido",
  testing: "Testing", entrega: "Entrega", otro: "Otro",
};
const CATEGORY_ORDER: PortalTaskCategory[] = ["diseno", "desarrollo", "contenido", "testing", "entrega", "otro"];

function TaskRow({ task }: { task: PortalTask }) {
  const ok = task.status === "completada";
  const wip = task.status === "en_progreso";

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <div className="shrink-0">
        {ok ? (
          <div className="w-4.5 h-4.5 rounded-full bg-white/10 border border-white/30 flex items-center justify-center" style={{ width: 18, height: 18 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : wip ? (
          <div className="rounded-full border border-white/40 bg-white/8 flex items-center justify-center" style={{ width: 18, height: 18 }}>
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
        ) : (
          <div className="rounded-full border border-white/15" style={{ width: 18, height: 18 }} />
        )}
      </div>
      <p className={`flex-1 text-sm leading-snug ${ok ? "line-through text-white/20" : wip ? "text-white/80" : "text-white/55"}`}>
        {task.titulo}
      </p>
      {wip && (
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40 shrink-0">
          Activo
        </span>
      )}
    </div>
  );
}

export function PortalTaskList({ tasks }: { tasks: PortalTask[] }) {
  if (tasks.length === 0) {
    return <p className="text-xs text-white/20 py-6 text-center">Sin tareas definidas aún.</p>;
  }

  const grouped = CATEGORY_ORDER.reduce<Record<string, PortalTask[]>>((acc, cat) => {
    const items = tasks.filter((t) => t.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([cat, items]) => {
        const done = items.filter((t) => t.status === "completada").length;
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/30">
                {CATEGORY_LABELS[cat as PortalTaskCategory]}
              </p>
              <div className="flex-1 h-px bg-white/[0.05]" />
              <span className="text-[9px] text-white/20 tabular-nums">{done}/{items.length}</span>
            </div>
            <div>{items.map((t) => <TaskRow key={t.id} task={t} />)}</div>
          </div>
        );
      })}
    </div>
  );
}
