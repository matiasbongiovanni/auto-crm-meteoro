import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Meteoro CRM",
  description: "Sistema de gestión de clientes, finanzas y agentes de Meteoro Agencia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`dark h-full ${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground antialiased" suppressHydrationWarning>
        {children}
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
