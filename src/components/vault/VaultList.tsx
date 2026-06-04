"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  RefreshCw,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { decrypt } from "@/lib/vault-crypto";
import { useCrm } from "@/components/crm/provider";
import { VaultItemForm } from "./VaultItemForm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { VaultItem } from "@/types/crm";

const AUTO_CLEAR_MS = 30_000;
const AUTO_LOCK_MS = 10 * 60 * 1000; // 10 min inactivity

type RevealState = { password: string; username: string; notas: string };

type Props = {
  cryptoKey: CryptoKey;
  onLock: () => void;
};

export function VaultList({ cryptoKey, onLock }: Props) {
  const { vaultList, vaultDeleteItem, vaultLogAudit } = useCrm();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<string, RevealState>>({});
  const [clearTimers, setClearTimers] = useState<Record<string, ReturnType<typeof setTimeout>>>({});
  const [editItem, setEditItem] = useState<VaultItem | null | "new">(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const resetLockTimer = useCallback(() => {
    clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(() => {
      toast.info("Bóveda bloqueada por inactividad");
      onLock();
    }, AUTO_LOCK_MS);
  }, [onLock]);

  useEffect(() => {
    resetLockTimer();
    return () => clearTimeout(lockTimer.current);
  }, [resetLockTimer]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vaultList();
      setItems(data);
    } catch {
      toast.error("Error al cargar la bóveda");
    } finally {
      setLoading(false);
    }
  }, [vaultList]);

  useEffect(() => { loadItems(); }, [loadItems]);

  async function handleReveal(item: VaultItem) {
    resetLockTimer();
    if (revealed[item.id]) {
      clearTimeout(clearTimers[item.id]);
      setRevealed((p) => { const n = { ...p }; delete n[item.id]; return n; });
      return;
    }
    try {
      const plain = await decrypt(cryptoKey, { ciphertext: item.ciphertext, iv: item.iv });
      const parsed = JSON.parse(plain) as RevealState;
      await vaultLogAudit("view", item.id);
      setRevealed((p) => ({ ...p, [item.id]: parsed }));
      const timer = setTimeout(() => {
        setRevealed((p) => { const n = { ...p }; delete n[item.id]; return n; });
      }, AUTO_CLEAR_MS);
      setClearTimers((p) => ({ ...p, [item.id]: timer }));
    } catch {
      toast.error("No se pudo descifrar");
    }
  }

  async function handleCopy(text: string, label: string) {
    resetLockTimer();
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado — se limpia en ${AUTO_CLEAR_MS / 1000}s`);
    setTimeout(() => navigator.clipboard.writeText("").catch(() => null), AUTO_CLEAR_MS);
  }

  async function handleDelete(id: string) {
    try {
      await vaultDeleteItem(id);
      await vaultLogAudit("delete", id);
      setItems((p) => p.filter((i) => i.id !== id));
      toast.success("Credencial eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
    setDeleteId(null);
  }

  const grouped = items.reduce<Record<string, VaultItem[]>>((acc, item) => {
    (acc[item.categoria] ||= []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4" onClick={resetLockTimer} onKeyDown={resetLockTimer}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} credencial{items.length !== 1 ? "es" : ""} · auto-lock en 10 min
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={loadItems} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
            Recargar
          </Button>
          <Button variant="outline" size="sm" onClick={() => { toast.info("Bóveda bloqueada"); onLock(); }}>
            <ShieldOff className="h-3.5 w-3.5 mr-1.5" />
            Bloquear
          </Button>
          <Button size="sm" onClick={() => setEditItem("new")}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Nueva
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border rounded-md py-12 text-center text-muted-foreground text-sm">
          No hay credenciales aún. Agregá la primera con "Nueva".
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                {cat}
              </p>
              <div className="space-y-1.5">
                {catItems.map((item) => {
                  const rev = revealed[item.id];
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-md border border-border px-3 py-2.5"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.nombre}</span>
                          {item.cliente && (
                            <Badge variant="outline" className="text-xs">
                              {item.cliente}
                            </Badge>
                          )}
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-foreground truncate max-w-[180px]"
                            >
                              {item.url.replace(/^https?:\/\//, "")}
                            </a>
                          )}
                        </div>
                        {rev && (
                          <div className="space-y-1 text-xs font-mono bg-muted/40 rounded px-2 py-1.5">
                            {rev.username && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">usuario:</span>
                                <span>{rev.username}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(rev.username, "Usuario")}
                                  className="ml-auto text-muted-foreground hover:text-foreground"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">contraseña:</span>
                              <span className="flex-1 break-all">{rev.password}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(rev.password, "Contraseña")}
                                className="shrink-0 text-muted-foreground hover:text-foreground"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                            {rev.notas && (
                              <div className="text-muted-foreground">{rev.notas}</div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleReveal(item)}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title={rev ? "Ocultar" : "Revelar"}
                        >
                          {rev ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditItem(item); resetLockTimer(); }}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(item.id)}
                          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create dialog */}
      <Dialog open={editItem !== null} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent className="max-w-md">
          {editItem !== null && (
            <VaultItemForm
              cryptoKey={cryptoKey}
              item={editItem === "new" ? undefined : (editItem as VaultItem)}
              onSaved={() => { setEditItem(null); loadItems(); }}
              onCancel={() => setEditItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar credencial</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. La credencial se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
