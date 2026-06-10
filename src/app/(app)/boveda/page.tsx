"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { VaultUnlock } from "@/components/vault/VaultUnlock";
import { VaultList } from "@/components/vault/VaultList";
import { useCrm } from "@/components/crm/provider";
import { toast } from "sonner";
import type { VaultMeta } from "@/types/crm";

export default function BovedaPage() {
  const { state, vaultGetMeta } = useCrm();
  const router = useRouter();
  const [meta, setMeta] = useState<VaultMeta | null | "loading">("loading");
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const initialized = useRef(false);

  // Gate: solo CEO
  useEffect(() => {
    if (state.profile && state.profile.role !== "ceo") {
      router.replace("/dashboard");
    }
  }, [state.profile, router]);

  // Load vault meta una sola vez cuando el profile está disponible
  useEffect(() => {
    if (!state.profile || initialized.current) return;
    initialized.current = true;
    vaultGetMeta()
      .then((m) => setMeta(m))
      .catch(() => {
        toast.error("Error al cargar la bóveda");
        setMeta(null);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.profile]);

  function handleUnlocked(key: CryptoKey) {
    setCryptoKey(key);
  }

  function handleLock() {
    setCryptoKey(null);
  }

  if (!state.profile || state.profile.role !== "ceo") return null;
  if (meta === "loading")
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
        Cargando bóveda…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Lock className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Bóveda de contraseñas</h1>
      </div>

      {cryptoKey ? (
        <VaultList cryptoKey={cryptoKey} onLock={handleLock} />
      ) : (
        <VaultUnlock meta={meta} onUnlocked={handleUnlocked} />
      )}
    </div>
  );
}
