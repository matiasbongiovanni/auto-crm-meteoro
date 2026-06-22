"use client";

import { cn } from "@/lib/utils";

/**
 * Barra de progreso fina superior que aparece durante refreshes de fondo.
 * No bloquea la UI ni ocupa layout (fixed). Reemplaza el spinner de página completa.
 */
export function TopProgressBar({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden transition-opacity duration-200",
        active ? "opacity-100" : "opacity-0",
      )}
      aria-hidden
    >
      {active && (
        <div
          className="h-full bg-gradient-to-r from-transparent via-foreground/80 to-transparent animate-[topbar_1.1s_ease-in-out_infinite]"
          style={{ width: "40%" }}
        />
      )}
    </div>
  );
}
