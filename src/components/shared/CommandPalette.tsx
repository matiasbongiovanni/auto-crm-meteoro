"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight, Plus } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useCrm } from "@/components/crm/provider";
import { useEmpresaDrawer } from "@/components/shared/EmpresaContext";
import { NAV_GROUPS, canSee } from "@/components/layout/NavGroups";
import { listEmpresas } from "@/lib/relaciones";

const QUICK_ACTIONS = [
  { label: "Nueva tarea", href: "/calendario" },
  { label: "Nuevo lead", href: "/leads" },
  { label: "Nuevo cobro", href: "/finanzas" },
  { label: "Nuevo documento", href: "/documentos" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { state } = useCrm();
  const { open: openEmpresa } = useEmpresaDrawer();
  const router = useRouter();
  const role = state.profile?.role;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Permite abrir desde otros lados (AppHeader) vía evento custom.
  useEffect(() => {
    function onOpen() { setOpen(true); }
    window.addEventListener("meteoro:open-command", onOpen);
    return () => window.removeEventListener("meteoro:open-command", onOpen);
  }, []);

  const empresas = useMemo(() => listEmpresas(state), [state]);

  function goTo(href: string) {
    setOpen(false);
    router.push(href);
  }

  function goEmpresa(name: string) {
    setOpen(false);
    openEmpresa(name);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Buscar" description="Saltá a cualquier sección, empresa o acción">
      <CommandInput placeholder="Buscar sección, empresa o acción..." />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>

        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((i) => canSee(i, role));
          if (items.length === 0) return null;
          return (
            <CommandGroup key={group.label} heading={group.label}>
              {items.map((item) => (
                <CommandItem key={item.href} value={`${group.label} ${item.label}`} onSelect={() => goTo(item.href)}>
                  <item.icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                  <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        <CommandGroup heading="Acciones rápidas">
          {QUICK_ACTIONS.map((a) => (
            <CommandItem key={a.label} value={`accion ${a.label}`} onSelect={() => goTo(a.href)}>
              <Plus className="h-3.5 w-3.5" />
              <span>{a.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {empresas.length > 0 && (
          <CommandGroup heading="Empresas">
            {empresas.map((name) => (
              <CommandItem key={name} value={`empresa ${name}`} onSelect={() => goEmpresa(name)}>
                <Building2 className="h-3.5 w-3.5" />
                <span>{name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
