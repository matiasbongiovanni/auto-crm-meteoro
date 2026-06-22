"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCrm } from "@/components/crm/provider";
import { useViewer } from "@/components/documentos/viewer-context";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopProgressBar } from "@/components/shared/TopProgressBar";
import { EmpresaProvider } from "@/components/shared/EmpresaContext";
import { EmpresaDrawer } from "@/components/shared/EmpresaDrawer";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function GeneradorViewer({
  src,
  title,
  onClose,
  onSaved,
}: {
  src: string;
  title: string;
  onClose: () => void;
  onSaved?: (payload: Record<string, unknown>) => void;
}) {
  useEffect(() => {
    function handleMsg(e: MessageEvent) {
      if (
        e.data?.type === "meteoro-quote-saved" ||
        e.data?.type === "meteoro-onboarding-saved" ||
        e.data?.type === "meteoro-planes-saved"
      ) {
        onSaved?.(e.data.payload);
      }
    }
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, [onSaved]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 shrink-0 bg-card">
        <p className="text-[12px] font-semibold uppercase tracking-widest text-foreground/80">{title}</p>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <iframe
        src={src}
        title={title}
        className="flex-1 w-full border-0"
        allow="print"
      />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, authReady, loading, refreshing } = useCrm();
  const { viewer, closeViewer, onSaved } = useViewer();
  const router = useRouter();

  useEffect(() => {
    if (authReady && !session) {
      router.push("/login");
    }
  }, [authReady, session, router]);

  // Solo el primer arranque (auth o initial load) bloquea la UI. Los refreshes
  // posteriores son silenciosos vía TopProgressBar — nunca desmontan children.
  if (!authReady || (authReady && !session) || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background ambient-bg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <EmpresaProvider>
      <TopProgressBar active={refreshing} />
      <div className="flex min-h-screen bg-background ambient-bg">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 overflow-auto p-4 pb-24 md:p-6 md:pb-6">
            {children}
          </main>
        </div>
        <BottomNav />
        <CommandPalette />
        <EmpresaDrawer />
        {viewer && (
          <GeneradorViewer
            src={viewer.src}
            title={viewer.title}
            onClose={closeViewer}
            onSaved={onSaved ?? undefined}
          />
        )}
      </div>
    </EmpresaProvider>
  );
}
