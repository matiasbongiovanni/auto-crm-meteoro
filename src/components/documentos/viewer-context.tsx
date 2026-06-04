"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type ViewerState = {
  src: string;
  title: string;
  tipo: "cotizacion" | "onboarding" | "planes";
} | null;

type ViewerContextType = {
  viewer: ViewerState;
  openViewer: (state: NonNullable<ViewerState>) => void;
  closeViewer: () => void;
  onSaved: ((payload: Record<string, unknown>) => void) | null;
  setOnSaved: (cb: ((payload: Record<string, unknown>) => void) | null) => void;
};

const ViewerContext = createContext<ViewerContextType | null>(null);

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<ViewerState>(null);
  const [onSaved, setOnSavedState] = useState<((payload: Record<string, unknown>) => void) | null>(null);

  const openViewer = useCallback((state: NonNullable<ViewerState>) => setViewer(state), []);
  const closeViewer = useCallback(() => {
    setViewer(null);
    setOnSavedState(null);
  }, []);

  function setOnSaved(cb: ((payload: Record<string, unknown>) => void) | null) {
    setOnSavedState(() => cb);
  }

  return (
    <ViewerContext.Provider value={{ viewer, openViewer, closeViewer, onSaved, setOnSaved }}>
      {children}
    </ViewerContext.Provider>
  );
}

export function useViewer() {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error("useViewer must be used within ViewerProvider");
  return ctx;
}
