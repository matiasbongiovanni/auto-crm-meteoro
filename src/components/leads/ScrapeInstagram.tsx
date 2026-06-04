"use client";

import { useState } from "react";
import { Loader2, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useCrm } from "@/components/crm/provider";
import { toast } from "sonner";

export function ScrapeInstagram({ onJobCreated }: { onJobCreated?: () => void }) {
  const { enqueueScrapeJob } = useCrm();
  const [handles, setHandles] = useState<string[]>([]);
  const [inputHandle, setInputHandle] = useState("");
  const [max, setMax] = useState(100);
  const [filterFoto, setFilterFoto] = useState(true);
  const [filterPublico, setFilterPublico] = useState(true);
  const [filterBioContacto, setFilterBioContacto] = useState(false);
  const [loading, setLoading] = useState(false);

  function addHandle() {
    const clean = inputHandle.replace("@", "").trim().toLowerCase();
    if (!clean) return;
    if (handles.includes(clean)) {
      toast.info("Ese handle ya está en la lista");
      return;
    }
    setHandles((prev) => [...prev, clean]);
    setInputHandle("");
  }

  function removeHandle(h: string) {
    setHandles((prev) => prev.filter((x) => x !== h));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (handles.length === 0) {
      toast.error("Agregá al menos un handle de competidor");
      return;
    }
    setLoading(true);
    try {
      const job = await enqueueScrapeJob("instagram", {
        handles,
        max,
        filters: {
          tiene_foto: filterFoto,
          cuenta_publica: filterPublico,
          bio_con_contacto: filterBioContacto,
        },
      });
      toast.success(`Job encolado — ID: ${job.id.slice(0, 8)}…`);
      setHandles([]);
      onJobCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al encolar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 max-w-lg">
      <p className="text-sm text-muted-foreground">
        Extrae seguidores reales de cuentas de la competencia en Instagram como posibles prospectos.
        Leads con <code className="text-xs bg-muted px-1 rounded">origen=instagram</code> pueden tener teléfono nulo (contactar por DM).
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Handles de competidores</Label>
          <div className="flex gap-2">
            <Input
              placeholder="@clinicaestetica"
              value={inputHandle}
              onChange={(e) => setInputHandle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addHandle();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addHandle}>
              Agregar
            </Button>
          </div>
          {handles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {handles.map((h) => (
                <Badge key={h} variant="secondary" className="gap-1">
                  <Share2 className="h-3 w-3" />
                  @{h}
                  <button
                    type="button"
                    onClick={() => removeHandle(h)}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="max-ig">Máximo seguidores a procesar</Label>
          <Input
            id="max-ig"
            type="number"
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
            min={10}
            max={2000}
          />
        </div>

        <div className="space-y-3 rounded-md border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Filtros de calidad ("seguidor real")
          </p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="f-foto" className="text-sm font-normal cursor-pointer">
                Tiene foto de perfil
              </Label>
              <Switch id="f-foto" checked={filterFoto} onCheckedChange={setFilterFoto} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="f-publico" className="text-sm font-normal cursor-pointer">
                Cuenta pública
              </Label>
              <Switch id="f-publico" checked={filterPublico} onCheckedChange={setFilterPublico} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="f-bio" className="text-sm font-normal cursor-pointer">
                Bio incluye datos de contacto (teléfono / web / email)
              </Label>
              <Switch id="f-bio" checked={filterBioContacto} onCheckedChange={setFilterBioContacto} />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={loading || handles.length === 0} className="w-full">
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="mr-2 h-4 w-4" />
          )}
          Encolar scraping Instagram
        </Button>
      </form>
    </div>
  );
}
