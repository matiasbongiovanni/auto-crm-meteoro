"use client";

import { FileDown } from "lucide-react";
import { renderInformePortal } from "@/lib/documents/render-informe-portal";
import type { EcommerceMetricas, PedidosEstadoMetricas, PortalProject, PortalUser } from "@/types/portal";

type Props = {
  project: PortalProject & { porcentaje_calculado: number };
  portalUser: PortalUser;
  metricas?: EcommerceMetricas | null;
  pedidosMetricas?: PedidosEstadoMetricas | null;
};

export function PortalPdfButton({ project, portalUser, metricas, pedidosMetricas }: Props) {
  function handleDescargar() {
    const html = renderInformePortal({ project, portalUser, metricas, pedidosMetricas });
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  }

  return (
    <button
      onClick={handleDescargar}
      className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors"
    >
      <FileDown className="w-3.5 h-3.5" />
      Descargar informe
    </button>
  );
}
