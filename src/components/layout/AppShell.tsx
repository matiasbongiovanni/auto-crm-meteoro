"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCrm } from "@/components/crm/provider";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Loader2 } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, authReady, loading } = useCrm();
  const router = useRouter();

  useEffect(() => {
    if (authReady && !session) {
      router.push("/login");
    }
  }, [authReady, session, router]);

  if (!authReady || (authReady && !session)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
