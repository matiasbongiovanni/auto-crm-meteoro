"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Copy, Eye, EyeOff, Pencil, Plus, Trash2,
  RefreshCw, ShieldOff, FolderOpen, Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { decrypt } from "@/lib/vault-crypto";
import { useCrm } from "@/components/crm/provider";
import { VaultItemForm } from "./VaultItemForm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { VaultItem, VaultTipo } from "@/types/crm";

const AUTO_CLEAR_MS = 30_000;
const AUTO_LOCK_MS = 10 * 60 * 1000;

type RevealState = { password: string; username: string; notas: string };

type Props = {
  cryptoKey: CryptoKey;
  onLock: () => void;
};

export function VaultList({ cryptoKey, onLock }: Props) {
  const { vaultList, vaultDeleteItem, vaultLogAudit } = useCrm();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<VaultTipo>("proyecto");
  const [revealed, setRevealed] = useState<Record<string, RevealState>>({});
  const [clearTimers, setClearTimers] = useState<Record<string, ReturnType<typeof setTimeout>>>({});
  const [editItem, setEditItem] = useState<VaultItem | null | "new">(null);
  const [newTipo, setNewTipo] = useState<VaultTipo>("proyecto");
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
      toast.error("No se pudo descifrar — passphrase incorrecta o ítem corrupto");
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

  function openNew(tipo: VaultTipo) {
    setNewTipo(tipo);
    setEditItem("new");
    resetLockTimer();
  }

  const tabItems = items.filter((i) => (i.tipo || "servicio") === tab);

  // Para proyectos: agrupar por cliente
  const byCliente = tabItems.reduce<Record<string, VaultItem[]>>((acc, i) => {
    const key = i.cliente || "Sin cliente";
    (acc[key] ||= []).push(i);
    return acc;
  }, {});

  // Para servicios: agrupar por categoría
  const byCategoria = tabItems.reduce<Record<string, VaultItem[]>>((acc, i) => {
    const key = i.categoria || "otro";
    (acc[key] ||= []).push(i);
    return acc;
  }, {});

  const grouped = tab === "proyecto" ? byCliente : byCategoria;

  const proyectoCount = items.filter((i) => (i.tipo || "servicio") === "proyecto").length;
  const servicioCount = items.filter((i) => (i.tipo || "servicio") === "servicio").length;

  return (
    <div className="space-y-4" onClick={resetLockTimer} onKeyDown={resetLockTimer}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} credencial{items.length !== 1 ? "es" : ""} · auto-lock 10 min
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
          <Button size="sm" onClick={() => openNew(tab)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Nueva
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["proyecto", "servicio"] as VaultTipo[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-b-2 -mb-px",
              tab === t
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "proyecto" ? <FolderOpen className="h-3.5 w-3.5" /> : <Wrench className="h-3.5 w-3.5" />}
            {t === "proyecto" ? "Proyectos" : "Servicios"}
            <Badge variant="outline" className="text-xs px-1.5 h-4">
              {t === "proyecto" ? proyectoCount : servicioCount}
            </Badge>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Cargando…</div>
      ) : tabItems.length === 0 ? (
        <div className="border border-dashed border-border rounded-md py-12 text-center text-muted-foreground text-sm">
          <p>No hay credenciales de {tab === "proyecto" ? "proyectos" : "servicios"} aún.</p>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => openNew(tab)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Agregar primera
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([group, groupItems]) => (
            <div key={group}>
              <div className="flex items-center gap-2 mb-2">
                {tab === "proyecto"
                  ? <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  : <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                }
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
                <span className="text-xs text-muted-foreground/50">({groupItems.length})</span>
              </div>
              <div className="space-y-1.5 pl-1">
                {groupItems.map((item) => (
                  <VaultItemRow
                    key={item.id}
                    item={item}
                    rev={revealed[item.id]}
                    onReveal={() => handleReveal(item)}
                    onCopy={handleCopy}
                    onEdit={() => { setEditItem(item); resetLockTimer(); }}
                    onDelete={() => setDeleteId(item.id)}
                    showCliente={tab === "servicio" && !!item.cliente}
                  />
                ))}
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
              item={editItem === "new"
                ? ({ tipo: newTipo, nombre: "", categoria: "otro", cliente: "", ciphertext: "", iv: "", url: "" } as VaultItem)
                : (editItem as VaultItem)
              }
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
              Esta acción es irreversible. La credencial cifrada se eliminará permanentemente.
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

// ─── Row component ─────────────────────────────────────────────────────────

type RowProps = {
  item: VaultItem;
  rev?: RevealState;
  onReveal: () => void;
  onCopy: (text: string, label: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  showCliente: boolean;
};

function VaultItemRow({ item, rev, onReveal, onCopy, onEdit, onDelete, showCliente }: RowProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border px-3 py-2.5">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{item.nombre}</span>
          {showCliente && item.cliente && (
            <Badge variant="outline" className="text-xs">{item.cliente}</Badge>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground truncate max-w-[200px]"
            >
              {item.url.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>

        {rev && (
          <div className="space-y-1 text-xs font-mono bg-muted/40 rounded px-2 py-1.5 mt-1">
            {rev.username && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-16 shrink-0">usuario:</span>
                <span className="flex-1 truncate">{rev.username}</span>
                <button
                  type="button"
                  onClick={() => onCopy(rev.username, "Usuario")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-16 shrink-0">clave:</span>
              <span className="flex-1 break-all">{rev.password}</span>
              <button
                type="button"
                onClick={() => onCopy(rev.password, "Contraseña")}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
            {rev.notas && (
              <div className="text-muted-foreground pt-0.5 border-t border-border/40">{rev.notas}</div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-1 shrink-0">
        <button
          type="button"
          onClick={onReveal}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={rev ? "Ocultar" : "Revelar"}
        >
          {rev ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Editar"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
