import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal de Clientes — meteoro.",
  description: "Seguí el estado de tu proyecto en tiempo real.",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
