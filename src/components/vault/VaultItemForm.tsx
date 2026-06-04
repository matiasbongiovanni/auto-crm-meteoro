"use client";

import { useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { encrypt } from "@/lib/vault-crypto";
import { useCrm } from "@/components/crm/provider";
import { toast } from "sonner";
import type { VaultItem } from "@/types/crm";

const CATEGORIAS = ["supabase", "hosting", "whatsapp", "crm", "ghl", "n8n", "cloudflare", "dominio", "smtp", "otro"];

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
  const [categoria, setCategoria] = useState(item?.categoria || "otro");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nombre = String(fd.get("nombre") || "").trim();
    const url = String(fd.get("url") || "").trim();
    const cliente = String(fd.get("cliente") || "").trim();

    if (!nombre) {
      toast.error("Nombre requerido");
      return;
    }
    if (!plainSecret) {
      toast.error("El secreto no puede estar vacío");
      return;
    }

    setLoading(true);
    try {
      // Encrypt the secret payload {user, password, notes} as JSON
      const username = String(fd.get("username") || "").trim();
      const notas = String(fd.get("notas") || "").trim();
      const payload = JSON.stringify({ password: plainSecret, username, notas });
      const { ciphertext, iv } = await encrypt(cryptoKey, payload);

      await vaultSaveItem({
        id: item?.id,
        nombre,
        categoria,
        cliente,
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="vi-nombre">Nombre *</Label>
            <Input id="vi-nombre" name="nombre" defaultValue={item?.nombre} placeholder="Supabase prod" required />
          </div>
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="vi-cliente">Cliente</Label>
            <Input id="vi-cliente" name="cliente" defaultValue={item?.cliente} placeholder="DentalQuality" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vi-url">URL</Label>
            <Input id="vi-url" name="url" defaultValue={item?.url} placeholder="https://app.supabase.com/…" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vi-username">Usuario / email</Label>
          <Input id="vi-username" name="username" placeholder="admin@ejemplo.com" autoComplete="off" />
        </div>

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
              className="pr-10"
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

        <div className="space-y-1.5">
          <Label htmlFor="vi-notas">Notas</Label>
          <Input id="vi-notas" name="notas" placeholder="Contexto adicional..." autoComplete="off" />
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
