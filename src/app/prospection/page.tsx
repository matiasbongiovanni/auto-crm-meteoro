import { ProspectionDashboard } from "@/components/prospection/ProspectionDashboard";

export const metadata = {
  title: "Dashboard de Prospección | Auto-CRM",
  description: "Métricas y análisis de prospección automática via WhatsApp",
};

export default function ProspectionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto py-8">
        <ProspectionDashboard />
      </div>
    </div>
  );
}
