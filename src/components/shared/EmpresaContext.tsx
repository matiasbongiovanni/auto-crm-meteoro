"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";

type EmpresaContextValue = {
  empresa: string | null;
  open: (empresa: string) => void;
  close: () => void;
};

const EmpresaCtx = createContext<EmpresaContextValue | null>(null);

export function EmpresaProvider({ children }: { children: React.ReactNode }) {
  const [empresa, setEmpresa] = useState<string | null>(null);

  const open = useCallback((e: string) => setEmpresa(e), []);
  const close = useCallback(() => setEmpresa(null), []);

  const value = useMemo(() => ({ empresa, open, close }), [empresa, open, close]);

  return <EmpresaCtx.Provider value={value}>{children}</EmpresaCtx.Provider>;
}

export function useEmpresaDrawer() {
  const ctx = useContext(EmpresaCtx);
  if (!ctx) throw new Error("useEmpresaDrawer must be used within EmpresaProvider");
  return ctx;
}
