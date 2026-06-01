"use client";

import { useRef } from "react";
import { Printer, Download, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { renderPresupuesto } from "@/lib/documents/render-presupuesto";
import { renderBienvenida } from "@/lib/documents/render-bienvenida";
import type { PresupuestoData, BienvenidaData } from "@/lib/documents/types";

type Props =
  | { tipo: "presupuesto"; data: PresupuestoData; open: boolean; onClose: () => void }
  | { tipo: "bienvenida"; data: BienvenidaData; open: boolean; onClose: () => void };

export function DocumentPreview({ tipo, data, open, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const html = tipo === "presupuesto"
    ? renderPresupuesto(data as PresupuestoData)
    : renderBienvenida(data as BienvenidaData);

  const clienteLabel =
    tipo === "presupuesto"
      ? (data as PresupuestoData).meta.cliente
      : (data as BienvenidaData).header.cliente;

  function handlePrint() {
    iframeRef.current?.contentWindow?.print();
  }

  function handleDownload() {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tipo}-${clienteLabel.toLowerCase().replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-6xl h-[calc(100vh-2rem)] flex flex-col gap-0 p-0 bg-[#0f0f0f] border-border/40">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 shrink-0">
          <p className="text-[12px] font-semibold text-foreground/80 uppercase tracking-widest">
            {tipo === "presupuesto" ? "Presupuesto" : "Carta de Bienvenida"} — {clienteLabel}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-[11px] border-border/40" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" /> Imprimir / PDF
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-[11px] border-border/40" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" /> Descargar HTML
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <iframe
          ref={iframeRef}
          srcDoc={html}
          title="Vista previa del documento"
          className="flex-1 w-full border-0 bg-white"
          sandbox="allow-same-origin allow-modals"
        />
      </DialogContent>
    </Dialog>
  );
}
