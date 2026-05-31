import { CrmProvider } from "@/components/crm/provider";
import { AppShell } from "@/components/layout/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CrmProvider>
      <AppShell>{children}</AppShell>
    </CrmProvider>
  );
}
