"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renderFacturaMantenimiento } from "@/lib/documents/render-factura-mantenimiento";

type Props = {
  onClose: () => void;
};

export function FacturaMantenimientoEditor({ onClose }: Props) {
  const [cliente, setCliente] = useState("");
  const [servicio, setServicio] = useState("Mantenimiento mensual");
  const [mes, setMes] = useState("");
  const [valor, setValor] = useState("");
  const [fechaEmision, setFechaEmision] = useState(() => new Date().toISOString().slice(0, 10));

  const valido = cliente.trim() && servicio.trim() && mes.trim() && valor && Number(valor) > 0;

  function handleDescargar() {
    if (!valido) return;
    const html = renderFacturaMantenimiento({
      cliente: cliente.trim(),
      servicio: servicio.trim(),
      mes: mes.trim(),
      valorUsd: Number(valor),
      fechaEmision,
    });
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="label-muted">Cliente</Label>
        <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="UroBalance" className="bg-muted/40 border-border/60" />
      </div>
      <div className="space-y-1">
        <Label className="label-muted">Servicio (concepto)</Label>
        <Input value={servicio} onChange={(e) => setServicio(e.target.value)} placeholder="Mantenimiento mensual — Everly by UroBalance" className="bg-muted/40 border-border/60" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="label-muted">Mes / período</Label>
          <Input value={mes} onChange={(e) => setMes(e.target.value)} placeholder="Agosto 2026" className="bg-muted/40 border-border/60" />
        </div>
        <div className="space-y-1">
          <Label className="label-muted">Valor USD</Label>
          <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="40" className="bg-muted/40 border-border/60" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="label-muted">Fecha de emisión</Label>
        <Input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} className="bg-muted/40 border-border/60" />
      </div>

      <p className="text-[10px] text-muted-foreground pt-1">
        Wallet de pago (USDT · red TRX) y firma quedan fijas en el template.
      </p>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>
        <Button size="sm" disabled={!valido} onClick={handleDescargar} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
          <FileDown className="h-3.5 w-3.5" /> Descargar PDF
        </Button>
      </div>
    </div>
  );
}
