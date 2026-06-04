"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, Clock, Loader2, XCircle, Map, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCrm } from "@/components/crm/provider";
import { cn } from "@/lib/utils";
import type { LeadJob } from "@/types/crm";

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; class: string }> = {
  pending: {
    icon: <Clock className="h-3.5 w-3.5" />,
    label: "Pendiente",
    class: "bg-muted text-muted-foreground border-border/50",
  },
  running: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    label: "Corriendo",
    class: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  done: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: "Completado",
    class: "bg-green-500/10 text-green-400 border-green-500/20",
  },
  error: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: "Error",
    class: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

function JobRow({ job }: { job: LeadJob }) {
  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
  const params = job.params as Record<string, unknown>;

  return (
    <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 text-sm">
      <div className="shrink-0 text-muted-foreground">
        {job.type === "maps" ? <Map className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium capitalize">{job.type}</span>
          {job.type === "maps" && typeof params.nicho === "string" && (
            <span className="text-muted-foreground">
              {params.nicho} · {typeof params.ciudad === "string" ? params.ciudad : ""}
            </span>
          )}
          {job.type === "instagram" && Array.isArray(params.handles) && (
            <span className="text-muted-foreground">
              @{(params.handles as string[]).slice(0, 2).join(", @")}
              {(params.handles as string[]).length > 2 ? ` +${(params.handles as string[]).length - 2}` : ""}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {new Date(job.created_at).toLocaleString("es-AR")}
          {job.status === "done" && job.result_count > 0 && (
            <span className="ml-2 text-green-400">{job.result_count} leads</span>
          )}
          {job.error_msg && <span className="ml-2 text-destructive truncate">{job.error_msg}</span>}
        </div>
      </div>

      <Badge
        variant="outline"
        className={cn("shrink-0 flex items-center gap-1 text-xs", cfg.class)}
      >
        {cfg.icon}
        {cfg.label}
      </Badge>
    </div>
  );
}

export function JobsList() {
  const { leadJobs, refreshLeadJobs } = useCrm();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshLeadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await refreshLeadJobs();
    setRefreshing(false);
  }

  if (leadJobs.length === 0)
    return (
      <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-md">
        No hay jobs todavía. Encolar un scraping arriba para empezar.
      </div>
    );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Jobs recientes</p>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", refreshing && "animate-spin")} />
          Actualizar
        </Button>
      </div>
      <div className="space-y-1.5">
        {leadJobs.slice(0, 20).map((job) => (
          <JobRow key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
