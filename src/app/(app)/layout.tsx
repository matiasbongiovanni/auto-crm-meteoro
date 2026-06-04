import { CrmProvider } from "@/components/crm/provider";
import { AppShell } from "@/components/layout/AppShell";
import { ViewerProvider } from "@/components/documentos/viewer-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CrmProvider>
      <ViewerProvider>
        <AppShell>{children}</AppShell>
      </ViewerProvider>
    </CrmProvider>
  );
}
