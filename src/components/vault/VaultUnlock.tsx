"use client";

import { useState } from "react";
import { Lock, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deriveKey, checkVerifier, makeVerifier, defaultKdfParams } from "@/lib/vault-crypto";
import { useCrm } from "@/components/crm/provider";
import { toast } from "sonner";
import type { VaultMeta } from "@/types/crm";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

type Props = {
  meta: VaultMeta | null;
  onUnlocked: (key: CryptoKey) => void;
};

export function VaultUnlock({ meta, onUnlocked }: Props) {
  const { vaultSetMeta, vaultLogAudit } = useCrm();
  const [passphrase, setPassphrase] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const isSetup = !meta;
  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
  const remainingSecs = isLocked ? Math.ceil((lockedUntil! - Date.now()) / 1000) : 0;

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (isLocked) return;
    if (!passphrase) return;

    if (isSetup && passphrase !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (isSetup && passphrase.length < 12) {
      toast.error("La passphrase debe tener al menos 12 caracteres");
      return;
    }

    setLoading(true);
    try {
      if (isSetup) {
        // First-time setup: create KDF params + verifier and store meta
        const kdfParams = defaultKdfParams();
        const key = await deriveKey(passphrase, kdfParams);
        const verifierBlob = await makeVerifier(key);
        await vaultSetMeta({
          kdf_params: kdfParams,
          verifier: verifierBlob.ciphertext,
          verifier_iv: verifierBlob.iv,
        });
        await vaultLogAudit("unlock");
        toast.success("Bóveda creada y desbloqueada");
        onUnlocked(key);
      } else {
        // Verify passphrase against stored verifier
        const key = await deriveKey(passphrase, meta.kdf_params);
        const valid = await checkVerifier(key, {
          ciphertext: meta.verifier,
          iv: meta.verifier_iv,
        });
        if (!valid) {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          if (newAttempts >= MAX_ATTEMPTS) {
            setLockedUntil(Date.now() + LOCKOUT_MS);
            setAttempts(0);
            toast.error(`Demasiados intentos fallidos. Bloqueado ${LOCKOUT_MS / 1000}s.`);
          } else {
            toast.error(`Passphrase incorrecta (${MAX_ATTEMPTS - newAttempts} intentos restantes)`);
          }
          setPassphrase("");
          return;
        }
        setAttempts(0);
        await vaultLogAudit("unlock");
        onUnlocked(key);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al desbloquear");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="rounded-full border border-border p-3">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">
            {isSetup ? "Crear bóveda" : "Desbloquear bóveda"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isSetup
              ? "Primera vez. Elegí una passphrase maestra fuerte (mín. 12 caracteres). No se puede recuperar si la perdés."
              : "Ingresá la passphrase maestra para acceder a las credenciales."}
          </p>
        </div>

        {isLocked ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-center text-destructive">
            Demasiados intentos. Esperá {remainingSecs}s antes de reintentar.
          </div>
        ) : (
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="passphrase">
                {isSetup ? "Passphrase maestra *" : "Passphrase *"}
              </Label>
              <div className="relative">
                <Input
                  id="passphrase"
                  type={showPass ? "text" : "password"}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                  className="pr-10"
                  placeholder={isSetup ? "mín. 12 caracteres" : ""}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isSetup && (
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmar passphrase *</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Repetí la passphrase"
                  required
                />
              </div>
            )}

            <Button type="submit" disabled={loading || !passphrase} className="w-full">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              {isSetup ? "Crear bóveda" : "Desbloquear"}
            </Button>
          </form>
        )}

        <p className="text-xs text-center text-muted-foreground/60">
          Zero-knowledge: la passphrase nunca sale del navegador.
        </p>
      </div>
    </div>
  );
}
