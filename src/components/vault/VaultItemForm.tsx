"use client";

import { useState } from "react";
import { Loader2, Eye, EyeOff, FolderOpen, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { encrypt } from "@/lib/vault-crypto";
import { useCrm } from "@/components/crm/provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { VaultItem, VaultTipo } from "@/types/crm";

const CATEGORIAS_SERVICIO = [
  "supabase", "vercel", "cloudflare", "n8n", "chatwoot",
  "ghl", "resend", "meta", "google", "openai", "anthropic",
  "twilio", "ycloud", "easypanel", "smtp", "dominio", "otro",
];

const CLIENTES_CONOCIDOS = [
  "DentalQuality", "CARA Medicina", "Core Studio", "SIDEAS",
  "Revitalis", "Multilab", "Aplus Construction", "Guatape",
  "Meteoro (interno)", "Núcleo ERP",
];

type SecretPayload = {
  password: string;
  username: string;
  notas: string;
};

type Props = {
  cryptoKey: CryptoKey;
  item?: VaultItem;
  onSaved: () => void;
  onCancel: () => void;
};

export function VaultItemForm({ cryptoKey, item, onSaved, onCancel }: Props) {
  const { vaultSaveItem, vaultLogAudit } = useCrm();
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [plainSecret, setPlainSecret] = useState("");
  const [tipo, setTipo] = useState<VaultTipo>(item?.tipo || "servicio");
  const [categoria, setCategoria] = useState(item?.categoria || "otro");
  const [cliente, setCliente] = useState<string>(item?.cliente || "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nombre = String(fd.get("nombre") || "").trim();
    const url = String(fd.get("url") || "").trim();
    const username = String(fd.get("username") || "").trim();
    const notas = String(fd.get("notas") || "").trim();
    const clienteFinal = tipo === "proyecto" ? cliente : "";

    if (!nombre) { toast.error("Nombre requerido"); return; }
    if (!plainSecret) { toast.error("El secreto no puede estar vacío"); return; }
    if (tipo === "proyecto" && !clienteFinal) { toast.error("Seleccioná el cliente"); return; }

    setLoading(true);
    try {
      const payload: SecretPayload = { password: plainSecret, username, notas };
      const { ciphertext, iv } = await encrypt(cryptoKey, JSON.stringify(payload));

      await vaultSaveItem({
        id: item?.id,
        tipo,
        nombre,
        categoria: tipo === "proyecto" ? "proyecto" : categoria,
        cliente: clienteFinal,
        ciphertext,
        iv,
        url,
        created_at: item?.created_at,
      });
      await vaultLogAudit(item ? "update" : "create", item?.id);
      toast.success(item ? "Credencial actualizada" : "Credencial guardada");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cifrar/guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{item ? "Editar credencial" : "Nueva credencial"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Tipo toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipo("proyecto")}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors",
              tipo === "proyecto"
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/40",
            )}
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            <div className="text-left">
              <div className="font-medium">Proyecto</div>
              <div className="text-xs opacity-70">Creds de un cliente</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setTipo("servicio")}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors",
              tipo === "servicio"
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/40",
            )}
          >
            <Wrench className="h-4 w-4 shrink-0" />
            <div className="text-left">
              <div className="font-medium">Servicio</div>
              <div className="text-xs opacity-70">Infra compartida</div>
            </div>
          </button>
        </div>

        {/* Cliente (solo proyecto) / Categoría (solo servicio) */}
        {tipo === "proyecto" ? (
          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <Select value={cliente} onValueChange={(v) => v && setCliente(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná el cliente..." />
              </SelectTrigger>
              <SelectContent>
                {CLIENTES_CONOCIDOS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="mt-1.5"
              placeholder="O escribí un cliente nuevo..."
              value={CLIENTES_CONOCIDOS.includes(cliente) ? "" : cliente}
              onChange={(e) => setCliente(e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Select value={categoria} onValueChange={(v) => v && setCategoria(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS_SERVICIO.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Nombre + URL */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="vi-nombre">Nombre *</Label>
            <Input
              id="vi-nombre"
              name="nombre"
              defaultValue={item?.nombre}
              placeholder={tipo === "proyecto" ? "Chatwoot DentalQuality" : "Supabase prod"}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vi-url">URL</Label>
            <Input
              id="vi-url"
              name="url"
              defaultValue={item?.url}
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Usuario */}
        <div className="space-y-1.5">
          <Label htmlFor="vi-username">Usuario / email</Label>
          <Input
            id="vi-username"
            name="username"
            placeholder="admin@ejemplo.com"
            autoComplete="off"
          />
        </div>

        {/* Secreto */}
        <div className="space-y-1.5">
          <Label htmlFor="vi-secret">
            Contraseña / API key <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="vi-secret"
              type={showSecret ? "text" : "password"}
              value={plainSecret}
              onChange={(e) => setPlainSecret(e.target.value)}
              placeholder="El secreto a cifrar"
              autoComplete="new-password"
              className="pr-10 font-mono text-sm"
              required
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <Label htmlFor="vi-notas">Notas</Label>
          <Textarea
            id="vi-notas"
            name="notas"
            placeholder="Contexto adicional (ej: token de solo lectura, expira 2027-01)"
            rows={2}
            className="resize-none text-sm"
            autoComplete="off"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar cifrado
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </>
  );
}
