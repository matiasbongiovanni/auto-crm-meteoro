"use client";

import { useRef, useState } from "react";
import { Download, Upload, CalendarDays, FileSpreadsheet, FileJson, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { exportICS, exportCSV, exportJSON, parseImport } from "@/lib/calendar-export";
import type { CalendarEvent } from "@/types/crm";

export function TaskToolbar({
  events,
  onImport,
}: {
  events: CalendarEvent[];
  onImport: (events: CalendarEvent[]) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  function guard(fn: () => void) {
    if (events.length === 0) { toast.error("No hay tareas para exportar"); return; }
    fn();
    toast.success("Exportado");
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const { events: parsed, errors } = parseImport(text);
      if (parsed.length === 0) {
        toast.error("No se pudo leer ninguna tarea válida");
        return;
      }
      await onImport(parsed);
      toast.success(`${parsed.length} importada${parsed.length > 1 ? "s" : ""}${errors ? ` · ${errors} con error` : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al importar");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept=".csv,.json,.txt" onChange={handleFile} className="hidden" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5 border-border/60 text-muted-foreground hover:text-foreground">
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {events.length} tareas
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => guard(() => exportICS(events))} className="gap-2 text-xs">
            <CalendarDays className="h-3.5 w-3.5" /> Calendario (.ics)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => guard(() => exportCSV(events))} className="gap-2 text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Planilla (.csv)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => guard(() => exportJSON(events))} className="gap-2 text-xs">
            <FileJson className="h-3.5 w-3.5" /> Backup (.json)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        size="sm" variant="outline" disabled={importing}
        onClick={() => fileRef.current?.click()}
        className="gap-1.5 border-border/60 text-muted-foreground hover:text-foreground"
      >
        {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        Importar
      </Button>
    </div>
  );
}
