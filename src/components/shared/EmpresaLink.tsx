"use client";

import { useEmpresaDrawer } from "@/components/shared/EmpresaContext";
import { cn } from "@/lib/utils";

/**
 * Chip/enlace clickeable de empresa (estilo Obsidian). Al hacer click abre el
 * drawer 360 con todo lo relacionado. Si no hay nombre, renderiza texto plano.
 */
export function EmpresaLink({
  name,
  className,
  muted,
}: {
  name?: string | null;
  className?: string;
  muted?: boolean;
}) {
  const { open } = useEmpresaDrawer();
  if (!name || !name.trim()) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        open(name);
      }}
      className={cn(
        "inline-flex items-center text-left underline-offset-2 hover:underline decoration-dotted transition-colors",
        muted ? "text-muted-foreground hover:text-foreground" : "text-foreground/90 hover:text-foreground",
        className,
      )}
      title={`Ver todo sobre ${name}`}
    >
      {name}
    </button>
  );
}
