"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCrm } from "@/components/crm/provider";
import { toast } from "sonner";

const NICHOS = ["clinica", "automatizacion", "inmobiliaria", "ecommerce", "dentista", "otro"];
const PAISES = ["argentina", "mexico", "colombia", "chile", "peru", "spain", "usa", "brasil"];

export function ScrapeMaps({ onJobCreated }: { onJobCreated?: () => void }) {
  const { enqueueScrapeJob } = useCrm();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nicho = String(fd.get("nicho") || "").trim();
    const ciudad = String(fd.get("ciudad") || "").trim();
    const pais = String(fd.get("pais") || "").trim();
    const max = Number(fd.get("max") || 20);

    if (!nicho || !ciudad) {
      toast.error("Nicho y ciudad son requeridos");
      return;
    }

    setLoading(true);
    try {
      const job = await enqueueScrapeJob("maps", { nicho, ciudad, pais, max });
      toast.success(`Job encolado — ID: ${job.id.slice(0, 8)}…`);
      (e.target as HTMLFormElement).reset();
      onJobCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al encolar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-muted-foreground">
        Scrapea negocios en Google Maps por nicho y ciudad. El worker Python procesa el job y carga los leads automáticamente.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="nicho-maps">Nicho *</Label>
            <Select name="nicho">
              <SelectTrigger id="nicho-maps">
                <SelectValue placeholder="Seleccioná" />
              </SelectTrigger>
              <SelectContent>
                {NICHOS.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pais-maps">País</Label>
            <Select name="pais" defaultValue="argentina">
              <SelectTrigger id="pais-maps">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAISES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ciudad-maps">Ciudad *</Label>
            <Input id="ciudad-maps" name="ciudad" placeholder="Buenos Aires" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max-maps">Máximo leads</Label>
            <Input id="max-maps" name="max" type="number" defaultValue={20} min={1} max={200} />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Encolar scraping Maps
        </Button>
      </form>
    </div>
  );
}
