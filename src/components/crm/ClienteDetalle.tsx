"use client";

import { useState } from "react";
import { X, Building2, Phone, Mail, Calendar, DollarSign, Activity, FileText, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCrm } from "@/components/crm/provider";
import { healthDeCliente, diasARenovacion, mrrDeCliente, invoicesDelMes } from "@/lib/clientes";
import { CLIENT_HEALTH_CONFIG, CLIENT_STATUS_CONFIG, INVOICE_STATUS_CONFIG, BILLING_CYCLE_LABELS, formatUsd, formatDate } from "@/lib/constants";
import type { Cliente, Invoice } from "@/types/crm";
import { toast } from "sonner";
import { renderFactura } from "@/lib/documents/render-factura";

interface Props {
  cliente: Cliente;
  onClose: () => void;
}

function InvoiceRow({ invoice, clienteNombre }: { invoice: Invoice; clienteNombre: string }) {
  const { markInvoicePaid, deleteInvoice } = useCrm();
  const [loading, setLoading] = useState(false);
  const cfg = INVOICE_STATUS_CONFIG[invoice.status] || INVOICE_STATUS_CONFIG.pendiente;

  async function handlePaid() {
    setLoading(true);
    try {
      await markInvoicePaid(invoice.id);
      toast.success("Factura marcada como pagada");
    } catch { toast.error("Error al marcar como pagada"); } finally { setLoading(false); }
  }

  function handlePdf() {
    const html = renderFactura({ invoice, clienteNombre });
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  }

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/10 last:border-0 gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground/80 truncate">{invoice.concepto}</p>
        <p className="text-[11px] text-muted-foreground">{invoice.period_month} · vence {formatDate(new Date(invoice.fecha_vencimiento))}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <p className="text-[13px] font-semibold text-foreground/90">{formatUsd(invoice.monto_usd)}</p>
        <span className={cn("text-[10px] font-semibold uppercase tracking-wide", cfg.color)}>{cfg.label}</span>
        {invoice.status === "pendiente" || invoice.status === "vencida" ? (
          <button onClick={handlePaid} disabled={loading} className="p-1 text-muted-foreground hover:text-[var(--success)] transition-colors" title="Marcar pagada">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button onClick={handlePdf} className="p-1 text-muted-foreground hover:text-foreground transition-colors" title="PDF">
          <FileText className="h-3.5 w-3.5" />
        </button>
        <button onClick={async () => { try { await deleteInvoice(invoice.id); toast.success("Eliminada"); } catch { toast.error("Error"); } }} className="p-1 text-muted-foreground hover:text-destructive transition-colors" title="Eliminar">
          <XCircle className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ClienteDetalle({ cliente, onClose }: Props) {
  const { state } = useCrm();
  const invoices = state.invoices.filter((i) => i.cliente_id === cliente.id);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const mesInvoices = invoicesDelMes(invoices, currentMonth);

  const health = healthDeCliente(cliente, state.invoices);
  const healthCfg = CLIENT_HEALTH_CONFIG[health];
  const statusCfg = CLIENT_STATUS_CONFIG[cliente.status];
  const dias = diasARenovacion(cliente);
  const mrr = mrrDeCliente(cliente);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l border-border/60 flex flex-col h-full overflow-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border/30">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-[16px] font-bold text-foreground tracking-tight">{cliente.nombre}</h2>
            </div>
            {cliente.empresa && <p className="text-[12px] text-muted-foreground">{cliente.empresa}</p>}
            <div className="flex items-center gap-2 mt-2">
              <span className={cn("text-[11px] font-semibold", statusCfg?.color)}>{statusCfg?.label}</span>
              <span className="text-muted-foreground">·</span>
              <span className={cn("flex items-center gap-1 text-[11px] font-semibold", healthCfg?.color)}>
                <span className={cn("w-1.5 h-1.5 rounded-full inline-block", healthCfg?.dot)} />
                {healthCfg?.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5 overflow-auto">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="metric-card rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">MRR aportado</p>
              </div>
              <p className="text-[16px] font-bold text-foreground">{formatUsd(mrr)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{BILLING_CYCLE_LABELS[cliente.billing_cycle]} · {formatUsd(cliente.fee_usd)}</p>
            </div>
            <div className="metric-card rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Renovación</p>
              </div>
              {dias !== null ? (
                <>
                  <p className={cn("text-[16px] font-bold", dias <= 0 ? "text-destructive" : dias <= 14 ? "text-[var(--warning)]" : "text-foreground")}>
                    {dias <= 0 ? "Vencido" : `${dias} días`}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(new Date(cliente.fecha_renovacion!))}</p>
                </>
              ) : (
                <p className="text-[16px] font-bold text-muted-foreground">—</p>
              )}
            </div>
          </div>

          {/* Producto / Contacto */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Producto</p>
            <p className="text-[13px] text-foreground/80">{cliente.producto || "—"}</p>
          </div>

          {(cliente.telefono || cliente.email || cliente.contacto) && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contacto</p>
              <div className="space-y-1.5">
                {cliente.contacto && <p className="text-[13px] text-foreground/80">{cliente.contacto}</p>}
                {cliente.telefono && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <p className="text-[13px] text-foreground/80">{cliente.telefono}</p>
                  </div>
                )}
                {cliente.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <p className="text-[13px] text-foreground/80">{cliente.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {cliente.contexto_path && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contexto</p>
              <div className="flex items-center gap-1.5">
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                <p className="text-[12px] text-muted-foreground font-mono">{cliente.contexto_path}</p>
              </div>
            </div>
          )}

          {cliente.notas && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notas</p>
              <p className="text-[13px] text-foreground/70 whitespace-pre-wrap">{cliente.notas}</p>
            </div>
          )}

          {/* Facturas del mes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Facturas · {currentMonth}
              </p>
              <div className="flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">{invoices.length} total</p>
              </div>
            </div>
            {mesInvoices.length === 0 && (
              <p className="text-[12px] text-muted-foreground">Sin facturas este mes</p>
            )}
            <div>
              {mesInvoices.map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} clienteNombre={cliente.nombre} />
              ))}
            </div>
          </div>

          {/* Historial completo */}
          {invoices.filter((i) => i.period_month !== currentMonth).length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Historial</p>
              <div>
                {invoices
                  .filter((i) => i.period_month !== currentMonth)
                  .slice(0, 6)
                  .map((inv) => (
                    <InvoiceRow key={inv.id} invoice={inv} clienteNombre={cliente.nombre} />
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground">Alta: {formatDate(new Date(cliente.fecha_alta))} · Owner: {cliente.owner || "—"}</p>
        </div>
      </div>
    </div>
  );
}
