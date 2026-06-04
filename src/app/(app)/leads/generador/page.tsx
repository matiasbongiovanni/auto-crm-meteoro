"use client";

import { Zap } from "lucide-react";
import { GeneradorTabs } from "@/components/leads/GeneradorTabs";
import { useCrm } from "@/components/crm/provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GeneradorPage() {
  const { state } = useCrm();
  const router = useRouter();

  // Only admin/ceo can access scraping tabs (formulario is open to all logged-in users)
  // The page itself is fine for any role — scraping enqueue checks role server-side
  useEffect(() => {
    if (state.profile && state.profile.role === "freelancer") {
      router.replace("/leads");
    }
  }, [state.profile, router]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Generador de Leads</h1>
      </div>
      <p className="text-sm text-muted-foreground max-w-xl">
        Cargá prospectos de forma manual, scrapea negocios en Google Maps, o extraé seguidores reales de cuentas de la competencia en Instagram.
      </p>
      <GeneradorTabs />
    </div>
  );
}
